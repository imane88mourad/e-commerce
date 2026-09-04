'use client'
import React from "react";
import { assets } from "@/assets/assets";
import OrderSummary from "@/components/OrderSummary";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useAppContext } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import Loading from "@/components/Loading";

const Cart = () => {

  const { products, router, cartItems, addToCart, updateCartQuantity, getCartCount, clearCart, currency, loading } = useAppContext();
  const { t, isRTL } = useLanguage();

  if (loading) {
    return (
      <>
        <Navbar />
        <Loading />
      </>
    );
  }

  const cartProducts = Object.keys(cartItems).map((itemId) => {
    const product = products.find(product => product._id === itemId);
    return { product, quantity: cartItems[itemId] };
  }).filter(item => item.product && item.quantity > 0);

  return (
    <>
      <Navbar />
      <div className="flex flex-col md:flex-row gap-10 px-6 md:px-16 lg:px-32 pt-14 mb-20">
        <div className="flex-1">
          <div className={`flex items-center justify-between mb-8 border-b border-gray-500/30 pb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <p className={`text-2xl md:text-3xl text-gray-500 ${isRTL ? 'text-right' : ''}`}>
              {t('cart.title')}
            </p>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {cartProducts.length > 0 && (
                <button
                  onClick={() => clearCart()}
                  className="text-sm text-gray-400 hover:text-red-500 transition"
                >
                  {t('cart.clearCart')}
                </button>
              )}
              <p className="text-lg md:text-xl text-gray-500/80">{getCartCount()} {t('cart.items')}</p>
            </div>
          </div>

          {cartProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">{t('cart.empty')}</p>
              <button
                onClick={() => router.push('/all-products')}
                className="text-orange-600 hover:underline"
              >
                {t('cart.continueShopping')}
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead className={`text-left ${isRTL ? 'text-right' : ''}`}>
                    <tr>
                      <th className="text-nowrap pb-6 md:px-4 px-1 text-gray-600 font-medium">
                        {t('cart.productDetails')}
                      </th>
                      <th className="pb-6 md:px-4 px-1 text-gray-600 font-medium">
                        {t('cart.price')}
                      </th>
                      <th className="pb-6 md:px-4 px-1 text-gray-600 font-medium">
                        {t('cart.quantity')}
                      </th>
                      <th className="pb-6 md:px-4 px-1 text-gray-600 font-medium">
                        {t('cart.subtotal')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartProducts.map(({ product, quantity }) => (
                      <tr key={product._id}>
                        <td className={`flex items-center gap-4 py-4 md:px-4 px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div>
                            <div className="rounded-lg overflow-hidden bg-gray-500/10 p-2">
                              <Image
                                src={product.image && product.image.length > 0 ? product.image[0] : assets.apple_earphone_image}
                                alt={product.name}
                                className="w-16 h-auto object-cover mix-blend-multiply"
                                width={1280}
                                height={720}
                              />
                            </div>
                            <button
                              className="md:hidden text-xs text-orange-600 mt-1"
                              onClick={() => updateCartQuantity(product._id, 0)}
                            >
                              {t('cart.remove')}
                            </button>
                          </div>
                          <div className="text-sm hidden md:block">
                            <p className="text-gray-800">{product.name}</p>
                            <button
                              className="text-xs text-orange-600 mt-1"
                              onClick={() => updateCartQuantity(product._id, 0)}
                            >
                              {t('cart.remove')}
                            </button>
                          </div>
                        </td>
                        <td className="py-4 md:px-4 px-1 text-gray-600">{currency}{product.offerPrice || product.price}</td>
                        <td className="py-4 md:px-4 px-1">
                          <div className={`flex items-center md:gap-2 gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button onClick={() => updateCartQuantity(product._id, quantity - 1)}>
                              <Image
                                src={assets.decrease_arrow}
                                alt="decrease_arrow"
                                className="w-4 h-4"
                              />
                            </button>
                            <input onChange={e => updateCartQuantity(product._id, Number(e.target.value))} type="number" value={quantity} className="w-8 border text-center appearance-none"></input>
                            <button onClick={() => addToCart(product._id)}>
                              <Image
                                src={assets.increase_arrow}
                                alt="increase_arrow"
                                className="w-4 h-4"
                              />
                            </button>
                          </div>
                        </td>
                        <td className="py-4 md:px-4 px-1 text-gray-600">{currency}{((product.offerPrice || product.price) * quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => router.push('/all-products')} className="group flex items-center mt-6 gap-2 text-orange-600">
                <Image
                  className={`group-hover:-translate-x-1 transition ${isRTL ? 'rotate-180 group-hover:translate-x-1' : ''}`}
                  src={assets.arrow_right_icon_colored}
                  alt="arrow_right_icon_colored"
                />
                {t('cart.continueShopping')}
              </button>
            </>
          )}
        </div>
        {cartProducts.length > 0 && <OrderSummary />}
      </div>
    </>
  );
};

export default Cart;
