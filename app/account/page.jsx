'use client'
import React, { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { assets } from "@/assets/assets";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

const Account = () => {
  const { token, userData, logout, fetchUserData, currency } = useAppContext();
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchUserData();
    fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!token) {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="px-6 md:px-16 lg:px-32 pt-14 mb-20">
        <div className={`flex flex-col md:flex-row gap-10 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
          {/* User Info */}
          <div className="w-full md:w-1/3">
            <div className={`bg-gray-500/5 rounded-lg p-6 ${isRTL ? 'text-right' : ''}`}>
              <div className={`flex items-center gap-4 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center text-white text-2xl font-medium">
                  {userData?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-xl font-medium text-gray-800">{userData?.full_name || 'User'}</h2>
                  <p className="text-gray-600 text-sm">{userData?.email || ''}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-gray-600">{t('account.phone')}</span>
                  <span className="text-gray-800">{userData?.phone || 'N/A'}</span>
                </div>
                <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-gray-600">{t('account.role')}</span>
                  <span className="text-gray-800 capitalize">{userData?.role || 'customer'}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition mt-6"
              >
                {t('account.logout')}
              </button>
            </div>
          </div>

          {/* Orders */}
          <div className="w-full md:w-2/3">
            <h2 className="text-2xl font-medium text-gray-800 mb-6">{t('account.myOrders')}</h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">{t('account.noOrders')}</p>
                <button
                  onClick={() => router.push('/all-products')}
                  className="text-orange-600 hover:underline mt-2"
                >
                  {t('account.startShopping')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-gray-500/5 rounded-lg p-4">
                    <div className={`flex justify-between items-start mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div>
                        <p className="text-sm text-gray-600">Order #{order.id}</p>
                        <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <p className="text-gray-800 font-medium">{currency}{order.total_amount}</p>
                      <button
                        onClick={() => router.push(`/order-success?orderId=${order.id}`)}
                        className="text-orange-600 hover:underline text-sm"
                      >
                        {t('account.viewDetails')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Account;
