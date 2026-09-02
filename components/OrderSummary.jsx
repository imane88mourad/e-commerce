import { useAppContext } from "@/context/AppContext";
import React, { useState } from "react";

const OrderSummary = () => {

  const { currency, router, promo, applyPromo, removePromo, getCartSummary } = useAppContext()

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

  const summary = getCartSummary();

  return (
    <div className="w-full md:w-96 bg-gray-500/5 p-5">
      <h2 className="text-xl md:text-2xl font-medium text-gray-700">
        Order Summary
      </h2>
      <hr className="border-gray-500/30 my-5" />

      <div className="space-y-6">
        <div>
          <label className="text-base font-medium uppercase text-gray-600 block mb-2">
            Promo Code
          </label>
          <form onSubmit={handleApplyPromo} className="flex flex-col items-start gap-3">
            {promo ? (
              <div className="flex w-full items-center justify-between gap-2 bg-green-50 border border-green-300 text-green-700 px-3 py-2.5 text-sm">
                <span className="font-medium">{promo.code} applied</span>
                <button
                  type="button"
                  onClick={() => { removePromo(); setPromoMsg(''); setPromoError(''); }}
                  className="text-xs underline hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  type="text"
                  placeholder="Enter promo code"
                  className="flex-grow w-full outline-none p-2.5 text-gray-600 border"
                />
                <button type="submit" className="bg-orange-600 text-white px-9 py-2 hover:bg-orange-700">
                  Apply
                </button>
              </>
            )}
            {promoMsg && <p className="text-xs text-green-600">{promoMsg}</p>}
            {promoError && <p className="text-xs text-red-500">{promoError}</p>}
          </form>
        </div>

        <hr className="border-gray-500/30 my-5" />

        <div className="space-y-4">
          <div className="flex justify-between text-base font-medium">
            <p className="uppercase text-gray-600">Items {summary.itemCount}</p>
            <p className="text-gray-800">{currency}{summary.subtotal.toFixed(2)}</p>
          </div>
          {summary.discount > 0 && (
            <div className="flex justify-between text-base">
              <p className="uppercase text-green-600">Promo ({promo?.code}) −{currency}{summary.discount.toFixed(2)}</p>
              <p className="font-medium text-gray-800">−{currency}{summary.discount.toFixed(2)}</p>
            </div>
          )}
          <div className="flex justify-between">
            <p className="text-gray-600">Shipping Fee</p>
            <p className="font-medium text-gray-800">{summary.shipping === 0 ? 'Free' : `${currency}${summary.shipping.toFixed(2)}`}</p>
          </div>
          <div className="flex justify-between">
            <p className="text-gray-600">Tax (VAT)</p>
            <p className="font-medium text-gray-800">{currency}{summary.vatTotal.toFixed(2)}</p>
          </div>
          <div className="flex justify-between text-lg md:text-xl font-medium border-t pt-3">
            <p>Total</p>
            <p>{currency}{summary.total.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Single path to checkout — works for guests AND logged-in users
          without forcing login. */}
      <button
        onClick={() => router.push('/checkout')}
        className="w-full bg-orange-600 text-white py-3 mt-5 hover:bg-orange-700"
      >
        Proceed to Checkout
      </button>
    </div>
  );
};

export default OrderSummary;
