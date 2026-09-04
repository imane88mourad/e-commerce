import { useAppContext } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import React, { useState } from "react";

const OrderSummary = () => {

  const { currency, router, promo, applyPromo, removePromo, getCartSummary } = useAppContext()
  const { t, isRTL } = useLanguage();

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
    <div className={`w-full md:w-96 bg-gray-500/5 p-5 ${isRTL ? 'text-right' : ''}`}>
      <h2 className="text-xl md:text-2xl font-medium text-gray-700">
        {t('orderSummary.title')}
      </h2>
      <hr className="border-gray-500/30 my-5" />

      <div className="space-y-6">
        <div>
          <label className={`text-base font-medium uppercase text-gray-600 block mb-2 ${isRTL ? 'text-right' : ''}`}>
            {t('orderSummary.promoCode')}
          </label>
          <form onSubmit={handleApplyPromo} className="flex flex-col items-start gap-3">
            {promo ? (
              <div className={`flex w-full items-center justify-between gap-2 bg-green-50 border border-green-300 text-green-700 px-3 py-2.5 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="font-medium">{promo.code} {t('orderSummary.applied')}</span>
                <button
                  type="button"
                  onClick={() => { removePromo(); setPromoMsg(''); setPromoError(''); }}
                  className="text-xs underline hover:text-red-600"
                >
                  {t('orderSummary.remove')}
                </button>
              </div>
            ) : (
              <>
                <input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  type="text"
                  placeholder={t('orderSummary.enterPromo')}
                  className="flex-grow w-full outline-none p-2.5 text-gray-600 border"
                />
                <button type="submit" className="bg-orange-600 text-white px-9 py-2 hover:bg-orange-700">
                  {t('orderSummary.apply')}
                </button>
              </>
            )}
            {promoMsg && <p className="text-xs text-green-600">{promoMsg}</p>}
            {promoError && <p className="text-xs text-red-500">{promoError}</p>}
          </form>
        </div>

        <hr className="border-gray-500/30 my-5" />

        <div className="space-y-4">
          <div className={`flex justify-between text-base font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
            <p className="uppercase text-gray-600">{t('orderSummary.items')} {summary.itemCount}</p>
            <p className="text-gray-800">{currency}{summary.subtotal.toFixed(2)}</p>
          </div>
          {summary.discount > 0 && (
            <div className={`flex justify-between text-base ${isRTL ? 'flex-row-reverse' : ''}`}>
              <p className="uppercase text-green-600">{t('orderSummary.promoCode')} ({promo?.code}) −{currency}{summary.discount.toFixed(2)}</p>
              <p className="font-medium text-gray-800">−{currency}{summary.discount.toFixed(2)}</p>
            </div>
          )}
          <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <p className="text-gray-600">{t('orderSummary.shippingFee')}</p>
            <p className="font-medium text-gray-800">{summary.shipping === 0 ? t('orderSummary.free') : `${currency}${summary.shipping.toFixed(2)}`}</p>
          </div>
          <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <p className="text-gray-600">{t('orderSummary.tax')}</p>
            <p className="font-medium text-gray-800">{currency}{summary.vatTotal.toFixed(2)}</p>
          </div>
          <div className={`flex justify-between text-lg md:text-xl font-medium border-t pt-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <p>{t('orderSummary.total')}</p>
            <p>{currency}{summary.total.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => router.push('/checkout')}
        className="w-full bg-orange-600 text-white py-3 mt-5 hover:bg-orange-700"
      >
        {t('orderSummary.proceedToCheckout')}
      </button>
    </div>
  );
};

export default OrderSummary;
