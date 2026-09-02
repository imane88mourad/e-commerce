'use client';
import React, { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Loading from "@/components/Loading";

const MyOrders = () => {

    const { currency, token, router } = useAppContext();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOrders = async () => {
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
            const res = await fetch(`${API_URL}/orders/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) {
                throw new Error('Failed to fetch orders');
            }

            const data = await res.json();
            setOrders(data.results || data);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchOrders();
    }, [token]);

    return (
        <>
            <Navbar />
            <div className="flex flex-col justify-between px-6 md:px-16 lg:px-32 py-6 min-h-screen">
                <div className="space-y-5">
                    <h2 className="text-lg font-medium mt-6">My Orders</h2>
                    {loading ? (
                        <Loading />
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-500">Error loading orders: {error}</p>
                            <button
                                onClick={() => { setLoading(true); setError(null); fetchOrders(); }}
                                className="text-orange-600 hover:underline mt-2"
                            >
                                Retry
                            </button>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-600">No orders yet.</p>
                            <button
                                onClick={() => router.push('/all-products')}
                                className="text-orange-600 hover:underline mt-2"
                            >
                                Start Shopping
                            </button>
                        </div>
                    ) : (
                        <div className="max-w-5xl border-t border-gray-300 text-sm">
                            {orders.map((order, index) => (
                                <div key={order.id || index} className="flex flex-col md:flex-row gap-5 justify-between p-5 border-b border-gray-300">
                                    <div className="flex-1 flex gap-5 max-w-80">
                                        <Image
                                            className="max-w-16 max-h-16 object-cover"
                                            src={assets.box_icon}
                                            alt="box_icon"
                                        />
                                        <p className="flex flex-col gap-3">
                                            <span className="font-medium text-base">
                                                {order.items && order.items.map((item) => {
                                                    const name = typeof item.product === 'object' ? item.product.name : 'Product';
                                                    return `${name} x ${item.quantity}`;
                                                }).join(", ")}
                                            </span>
                                            <span>Items : {order.items ? order.items.length : 0}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <p>
                                            {order.guest_full_name ? (
                                                <>
                                                    <span className="font-medium">{order.guest_full_name}</span>
                                                    <br />
                                                    <span>{order.guest_address}</span>
                                                    <br />
                                                    <span>{`${order.guest_city}, ${order.guest_state}`}</span>
                                                    <br />
                                                    <span>{order.guest_phone}</span>
                                                </>
                                            ) : order.address ? (
                                                <>
                                                    <span className="font-medium">{order.address.full_name || order.address.fullName || ''}</span>
                                                    <br />
                                                    <span>{order.address.area || ''}</span>
                                                    <br />
                                                    <span>{`${order.address.city || ''}, ${order.address.state || ''}`}</span>
                                                    <br />
                                                    <span>{order.address.phone_number || order.address.phoneNumber || ''}</span>
                                                </>
                                            ) : (
                                                <span className="font-medium">Guest Order</span>
                                            )}
                                        </p>
                                    </div>
                                    <p className="font-medium my-auto">{currency}{order.amount}</p>
                                    <div>
                                        <p className="flex flex-col">
                                            <span>Method : {order.payment_method === 'cod' ? 'COD' : order.payment_method}</span>
                                            <span>Date : {new Date(order.date).toLocaleDateString()}</span>
                                            <span>Status : <span className="capitalize">{order.status}</span></span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
};

export default MyOrders;
