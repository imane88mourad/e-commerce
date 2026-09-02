'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const PaymentFailedContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get('orderId');
  const email = searchParams.get('email') || '';

  const retryPayment = () => {
    if (orderId) {
      // Go back to the checkout with the order
      router.push(`/checkout`);
    } else {
      router.push('/cart');
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Failure icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">Paiement non confirmé</h1>
          <p className="text-gray-500 mb-6">
            Le paiement n&apos;a pas pu être traité. Votre commande a été conservée.
          </p>

          {orderId && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Commande</span>
                <span className="font-medium text-gray-800">#{orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Statut</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  Échoué
                </span>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-yellow-700">
              Aucun montant n&apos;a été débité. Vous pouvez réessayer le paiement ou choisir un autre moyen de paiement.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={retryPayment}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 transition"
            >
              Réessayer le paiement
            </button>
            <button
              onClick={() => router.push('/cart')}
              className="w-full border border-gray-300 text-gray-600 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Retour au panier
            </button>
            <a
              href="https://wa.me/213000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-gray-500 text-sm hover:text-gray-700 transition"
            >
              Contacter le support
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Chargement...</p></div>}>
      <PaymentFailedContent />
    </Suspense>
  );
}
