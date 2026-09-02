'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const PaymentSuccessContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get('orderId');
  const reference = searchParams.get('reference');

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Success icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">Paiement confirmé</h1>
          <p className="text-gray-500 mb-6">
            Votre paiement a été traité avec succès.
          </p>

          {/* Order details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
            {orderId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Commande</span>
                <span className="font-medium text-gray-800">#{orderId}</span>
              </div>
            )}
            {reference && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Référence</span>
                <span className="font-medium text-gray-800 text-xs">{reference}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Statut</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Payé
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Vous recevrez un email de confirmation avec les détails de votre commande.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            {orderId && (
              <button
                onClick={() => router.push(`/order-success?orderId=${orderId}`)}
                className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 transition"
              >
                Voir ma commande
              </button>
            )}
            <button
              onClick={() => router.push('/')}
              className="w-full border border-gray-300 text-gray-600 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Continuer mes achats
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Chargement...</p></div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
