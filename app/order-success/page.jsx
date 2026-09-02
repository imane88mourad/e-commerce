'use client'
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { assets } from "@/assets/assets";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useAppContext } from "@/context/AppContext";

const OrderSuccessContent = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const guestEmail = searchParams.get('guestEmail');
  const { token, currency } = useAppContext();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/api\/?$/, '');

      try {
        let res;
        if (token) {
          // Authenticated user — fetch with token
          res = await fetch(`${API_URL}/api/orders/${orderId}/`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } else if (guestEmail) {
          // Guest — fetch with order ID + email
          res = await fetch(`${API_URL}/api/orders/guest/${orderId}/?email=${encodeURIComponent(guestEmail)}`);
        }

        if (res && res.ok) {
          const data = await res.json();
          setOrder(data);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, token, guestEmail]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-xl text-gray-600">Order not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="max-w-2xl w-full text-center">
          <Image
            src={assets.order_icon}
            alt="Order Success"
            className="w-24 h-24 mx-auto mb-6"
            width={96}
            height={96}
          />
          <h1 className="text-3xl font-medium text-gray-800 mb-4">Order Placed Successfully!</h1>
          <p className="text-gray-600 mb-2">Thank you for your purchase.</p>
          <p className="text-gray-600 mb-8">Order ID: <span className="font-medium">{order.id}</span></p>

          <div className="bg-gray-500/5 rounded-lg p-6 text-left mb-8">
            <h2 className="text-xl font-medium mb-4">Order Details</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Date:</span>
                <span className="text-gray-800">{new Date(order.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-gray-800 capitalize">{order.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="text-gray-800">{currency}{order.amount}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/all-products'}
            className="bg-orange-600 text-white px-8 py-3 rounded hover:bg-orange-700 transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </>
  );
};

export default function OrderSuccess() {
  return (
    <Suspense fallback={<><Navbar /><div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div></div></>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
