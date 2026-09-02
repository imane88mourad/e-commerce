'use client';
import React, { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Footer from "@/components/seller/Footer";
import Loading from "@/components/Loading";
import { sellerApi } from "@/lib/api/seller";

const Orders = () => {

    const { currency, token, router } = useAppContext();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSellerOrders = async () => {
        if (!token) {
            router.push('/login');
            return;
        }
        try {
            setLoading(true);
            const data = await sellerApi.getOrders();
            setOrders(data.results || data);
        } catch (err) {
            console.error('Failed to fetch seller orders:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await sellerApi.updateOrderStatus(orderId, newStatus);
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        } catch (err) {
            alert('Failed to update status: ' + err.message);
        }
    }

    useEffect(() => {
        fetchSellerOrders();
    }, [token]);

    return (
        <div className="flex-1 h-screen overflow-scroll flex flex-col justify-between text-sm">
            {loading ? <Loading /> : error ? (
                <div className="md:p-10 p-4">
                    <h2 className="text-lg font-medium">Orders</h2>
                    <p className="text-red-500 mt-2">Error: {error}</p>
                    <button onClick={() => { setError(null); fetchSellerOrders(); }} className="text-orange-600 hover:underline mt-2">
                        Retry
                    </button>
                </div>
            ) : (
                <div className="md:p-10 p-4 space-y-5">
                    <h2 className="text-lg font-medium">Orders</h2>
                    {orders.length === 0 ? (
                        <p className="text-gray-500">No orders yet.</p>
                    ) : (
                        <div className="max-w-4xl rounded-md">
                            {orders.map((order, index) => (
                                <div key={order.id || index} className="flex flex-col md:flex-row gap-5 justify-between p-5 border-t border-gray-300">
                                    <div className="flex-1 flex gap-5 max-w-80">
                                        <Image
                                            className="max-w-16 max-h-16 object-cover"
                                            src={assets.box_icon}
                                            alt="box_icon"
                                        />
                                        <p className="flex flex-col gap-3">
                                            <span className="font-medium">
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
                                            <span>
                                                Status :{' '}
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                    className="border rounded px-2 py-1 text-xs"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="processing">Processing</option>
                                                    <option value="shipped">Shipped</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            <Footer />
        </div>
    );
};

export default Orders;
