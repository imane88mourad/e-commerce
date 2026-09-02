'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const MockPaymentContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get('order_id');
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency') || 'DZD';
  const reference = searchParams.get('reference');
  const email = searchParams.get('email') || '';

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!orderId || !amount) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-red-500">Paramètres de paiement invalides.</p>
        </div>
      </>
    );
  }

  const formatDZD = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('fr-DZ') + ' DA';
  };

  const simulatePayment = async (success) => {
    setProcessing(true);
    setError('');

    try {
      const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/api\/?$/, '');

      const res = await fetch(`${API_URL}/api/payments/mock/simulate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: parseInt(orderId),
          success,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Simulation failed');
        setProcessing(false);
        return;
      }

      // Redirect to success or failure page
      if (success) {
        router.push(`/payment/success?orderId=${orderId}&reference=${reference || ''}&email=${encodeURIComponent(email)}`);
      } else {
        router.push(`/payment/failed?orderId=${orderId}&email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      console.error('Payment simulation error:', err);
      setError('Erreur de connexion. Veuillez réessayer.');
      setProcessing(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Paiement Sécurisé</h1>
            <p className="text-gray-500 text-sm mt-1">QuickCart — Mode Test</p>
          </div>

          {/* Order details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Commande</span>
              <span className="font-medium text-gray-800">#{orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Référence</span>
              <span className="font-medium text-gray-800 text-xs">{reference}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
              <span className="text-gray-600 font-medium">Total</span>
              <span className="text-xl font-bold text-orange-600">{formatDZD(amount)}</span>
            </div>
          </div>

          {/* Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-center">
            <p className="text-sm text-blue-700">
              🧪 <strong>Mode test</strong> — Aucun paiement réel ne sera effectué.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm text-center">
              {error}
            </div>
          )}

          {/* Mock form */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Numéro de carte</label>
              <input
                type="text"
                value="4242 4242 4242 4242"
                readOnly
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Expiration</label>
                <input type="text" value="12/28" readOnly className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">CVV</label>
                <input type="text" value="123" readOnly className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm" />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 mt-6">
            <button
              onClick={() => simulatePayment(true)}
              disabled={processing}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Traitement en cours...
                </span>
              ) : (
                '✓ Approuver le paiement'
              )}
            </button>

            <button
              onClick={() => simulatePayment(false)}
              disabled={processing}
              className="w-full border border-red-300 text-red-600 py-3 rounded-lg font-medium hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✗ Refuser le paiement
            </button>

            <button
              onClick={() => router.push(`/payment/failed?orderId=${orderId}&email=${encodeURIComponent(email)}`)}
              disabled={processing}
              className="w-full text-gray-500 py-2 text-sm hover:text-gray-700 transition"
            >
              Annuler et revenir
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Ceci est une page de test. En production, un vrai passerelle de paiement sera utilisé.
          </p>
        </div>
      </div>
    </>
  );
};

export default function MockPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Chargement...</p></div>}>
      <MockPaymentContent />
    </Suspense>
  );
}
