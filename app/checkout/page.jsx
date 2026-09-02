'use client'
import React, { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import { assets } from "@/assets/assets";

const Checkout = () => {
  const { products, router, cartItems, setCartItems, getCartCount, currency, token, userData, promo, applyPromo, removePromo, getCartSummary } = useAppContext();

  const [promoInput, setPromoInput] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [promoError, setPromoError] = useState('');

  const [promoLoading, setPromoLoading] = useState(false);

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoMsg('');
    setPromoError('');
    const result = await applyPromo(promoInput);
    setPromoInput('');
    setPromoLoading(false);
    if (result.ok) {
      setPromoMsg(result.message);
      setPromoError('');
    } else {
      setPromoError(result.message);
      setPromoMsg('');
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const [form, setForm] = useState({
    guest_first_name: '',
    guest_last_name: '',
    guest_email: '',
    guest_phone: '',
    guest_address: '',
    guest_city: '',
    guest_state: '',
    guest_shipping_info: '',
  });

  // Pre-fill form for logged-in users (allows editing; login stays optional)
  useEffect(() => {
    if (userData) {
      setForm((prev) => ({
        ...prev,
        guest_first_name: userData.first_name || (userData.full_name ? userData.full_name.split(' ')[0] : ''),
        guest_last_name: userData.last_name || (userData.full_name ? userData.full_name.split(' ').slice(1).join(' ') : ''),
        guest_email: userData.email || '',
        guest_phone: userData.phone || userData.phone_number || '',
      }));
    }
  }, [userData]);

  const cartProducts = Object.keys(cartItems).map((itemId) => {
    const product = products.find(p => p._id === itemId);
    return { product, quantity: cartItems[itemId] };
  }).filter(item => item.product && item.quantity > 0);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (cartProducts.length === 0) {
      setError('Your cart is empty');
      return;
    }

    // Validate required fields
    const required = ['guest_first_name', 'guest_last_name', 'guest_email', 'guest_phone', 'guest_address', 'guest_city', 'guest_state'];
    for (const field of required) {
      if (!form[field].trim()) {
        setError(`Please fill in all required fields`);
        return;
      }
    }

    setLoading(true);

    try {
      const items = cartProducts.map(({ product, quantity }) => ({
        product_id: product.id,
        quantity,
      }));

      const payload = {
        ...form,
        payment_method: paymentMethod,
        promo_code: promo?.code || '',
        items,
      };

      const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/api\/?$/, '');

      const headers = { 'Content-Type': 'application/json' };
      // If logged in, send the token so the order is linked to the account
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/orders/guest/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const order = await res.json();
        setCartItems({});
        removePromo();

        // If online payment selected, initiate payment
        if (paymentMethod === 'online_card') {
          try {
            const payRes = await fetch(`${API_URL}/api/payments/initiate/${order.id}/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                provider: 'mock',
                email: form.guest_email,
              }),
            });

            if (payRes.ok) {
              const payData = await payRes.json();
              // Redirect to the mock payment page
              router.push(payData.payment_url + `&email=${encodeURIComponent(form.guest_email)}`);
              return;
            } else {
              // Payment initiation failed — order was still created, redirect to success
              router.push(`/order-success?orderId=${order.id}&guestEmail=${encodeURIComponent(form.guest_email)}`);
              return;
            }
          } catch (payErr) {
            console.error('Payment initiation error:', payErr);
            // Order created but payment failed — redirect to order success
            router.push(`/order-success?orderId=${order.id}&guestEmail=${encodeURIComponent(form.guest_email)}`);
            return;
          }
        }

        // COD / bank transfer — go straight to success
        router.push(`/order-success?orderId=${order.id}&guestEmail=${encodeURIComponent(form.guest_email)}`);
      } else {
        const err = await res.json();
        setError(err.detail || err.error || JSON.stringify(err));
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const summary = getCartSummary();
  const subtotal = summary.subtotal;
  const tax = summary.vatTotal;
  const discount = summary.discount;
  const total = summary.total;

  return (
    <>
      <Navbar />
      <div className="flex flex-col md:flex-row gap-10 px-6 md:px-16 lg:px-32 pt-14 mb-20">
        {/* Left: Form */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-8 border-b border-gray-500/30 pb-6">
            <p className="text-2xl md:text-3xl text-gray-500">
              <span className="font-medium text-orange-600">Checkout</span>
            </p>
            {!token && (
              <p className="text-sm text-gray-400">
                Or <button onClick={() => router.push('/login')} className="text-orange-600 hover:underline">sign in</button> to auto-fill
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-base font-medium uppercase text-gray-600 block mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="guest_first_name"
                  value={form.guest_first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <label className="text-base font-medium uppercase text-gray-600 block mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="guest_last_name"
                  value={form.guest_last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-base font-medium uppercase text-gray-600 block mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="guest_email"
                  value={form.guest_email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="text-base font-medium uppercase text-gray-600 block mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="guest_phone"
                  value={form.guest_phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div>
              <label className="text-base font-medium uppercase text-gray-600 block mb-2">
                Address *
              </label>
              <input
                type="text"
                name="guest_address"
                value={form.guest_address}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                placeholder="Enter your full address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-base font-medium uppercase text-gray-600 block mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="guest_city"
                  value={form.guest_city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="text-base font-medium uppercase text-gray-600 block mb-2">
                  Wilaya / State *
                </label>
                <input
                  type="text"
                  name="guest_state"
                  value={form.guest_state}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder="Wilaya"
                />
              </div>
            </div>

            <div>
              <label className="text-base font-medium uppercase text-gray-600 block mb-2">
                Shipping Information
              </label>
              <textarea
                type="text"
                name="guest_shipping_info"
                value={form.guest_shipping_info}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                placeholder="Delivery instructions, notes, preferred time, etc. (optional)"
                rows={3}
              />
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className="text-base font-medium uppercase text-gray-600 block mb-3">
                Payment Method *
              </label>
              <div className="space-y-3">
                {/* Cash on Delivery */}
                <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition ${paymentMethod === 'cod' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">Cash on Delivery</span>
                    <p className="text-xs text-gray-500 mt-0.5">Pay when you receive your order</p>
                  </div>
                  <span className="text-lg">💵</span>
                </label>

                {/* Bank Transfer */}
                <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition ${paymentMethod === 'bank_transfer' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">Bank Transfer</span>
                    <p className="text-xs text-gray-500 mt-0.5">Transfer to our bank account</p>
                  </div>
                  <span className="text-lg">🏦</span>
                </label>

                {/* Online Payment */}
                <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition ${paymentMethod === 'online_card' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="online_card"
                    checked={paymentMethod === 'online_card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-orange-600 focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">Online Payment</span>
                    <p className="text-xs text-gray-500 mt-0.5">Pay securely online (card / mobile)</p>
                  </div>
                  <span className="text-lg">💳</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || cartProducts.length === 0}
              className="w-full bg-orange-600 text-white py-3.5 mt-6 hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? 'Placing Order...' : paymentMethod === 'online_card'
                ? `Pay — ${currency}${total.toFixed(2)}`
                : `Place Order — ${currency}${total.toFixed(2)}`
              }
            </button>
          </form>
        </div>

        {/* Right: Order Summary */}
        <div className="w-full md:w-96 bg-gray-500/5 p-5 h-fit">
          <h2 className="text-xl md:text-2xl font-medium text-gray-700">Order Summary</h2>
          <hr className="border-gray-500/30 my-5" />

          <div className="space-y-4 max-h-64 overflow-y-auto">
            {cartProducts.map(({ product, quantity }) => (
              <div key={product._id} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-500/10 rounded flex items-center justify-center overflow-hidden">
                  <Image
                    src={product.image && product.image.length > 0 ? product.image[0] : assets.apple_earphone_image}
                    alt={product.name}
                    className="w-full h-full object-cover mix-blend-multiply"
                    width={1280}
                    height={720}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">Qty: {quantity}</p>
                </div>
                <p className="text-sm font-medium text-gray-800">
                  {currency}{((product.offerPrice || product.price) * quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <hr className="border-gray-500/30 my-5" />

          {/* Promo code */}
          <form onSubmit={handleApplyPromo} className="mb-4">
            <label className="text-base font-medium uppercase text-gray-600 block mb-2">
              Promo Code
            </label>
            {promo ? (
              <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-300 text-green-700 px-3 py-2.5 text-sm">
                <span className="font-medium">{promo.code} applied</span>
                <button type="button" onClick={() => { removePromo(); setPromoMsg(''); setPromoError(''); }} className="text-xs underline hover:text-red-600">
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  type="text"
                  placeholder="Enter promo code"
                  className="flex-grow outline-none p-2.5 text-gray-600 border"
                />
                <button type="submit" className="bg-orange-600 text-white px-5 py-2 hover:bg-orange-700">
                  Apply
                </button>
              </div>
            )}
            {promoMsg && <p className="text-xs text-green-600 mt-1">{promoMsg}</p>}
            {promoError && <p className="text-xs text-red-500 mt-1">{promoError}</p>}
          </form>

          <div className="space-y-3">
            <div className="flex justify-between text-base font-medium">
              <p className="uppercase text-gray-600">Items {getCartCount()}</p>
              <p className="text-gray-800">{currency}{subtotal.toFixed(2)}</p>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-base">
                <p className="uppercase text-green-600">Promo ({promo?.code})</p>
                <p className="font-medium text-gray-800">−{currency}{discount.toFixed(2)}</p>
              </div>
            )}
            <div className="flex justify-between">
              <p className="text-gray-600">Shipping Fee</p>
              <p className="font-medium text-gray-800">Free</p>
            </div>
            <div className="flex justify-between">
              <p className="text-gray-600">Tax (VAT)</p>
              <p className="font-medium text-gray-800">{currency}{tax.toFixed(2)}</p>
            </div>
            <div className="flex justify-between text-lg md:text-xl font-medium border-t pt-3">
              <p>Total</p>
              <p>{currency}{total.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Checkout;
