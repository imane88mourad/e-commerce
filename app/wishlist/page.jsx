'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';
import { wishlistApi } from '@/lib/api/reviews';
import { formatPrice, resolveMediaUrl } from '@/lib/api/admin-products';
import { assets } from '@/assets/assets';
import { toast } from 'react-hot-toast';

export default function WishlistPage() {
    const { user, router, addToCart } = useAppContext();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState(null);

    const load = useCallback(() => {
        if (!user) { setLoading(false); return; }
        setLoading(true);
        wishlistApi.list()
            .then((data) => setItems(data.results || data || []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, [user]);

    useEffect(() => { load(); }, [load]);

    const handleRemove = async (item) => {
        setRemoving(item.id);
        try {
            await wishlistApi.remove(item.product);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            toast.success('Retiré des favoris.');
        } catch (err) {
            toast.error(err.message || 'Erreur.');
        } finally {
            setRemoving(null);
        }
    };

    const handleAddToCart = (item) => {
        addToCart(item.product);
        toast.success('Ajouté au panier.');
    };

    if (!user) {
        return (
            <>
                <Navbar />
                <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 gap-4">
                    <p className="text-gray-500 text-lg">Connectez-vous pour voir votre liste de favoris.</p>
                    <Link href="/login" className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
                        Se connecter
                    </Link>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="px-6 md:px-16 lg:px-32 pt-14 pb-20">
                <h1 className="text-2xl font-medium text-gray-800 mb-8">
                    Ma Liste de Favoris
                    {items.length > 0 && <span className="text-gray-400 font-normal ml-2">({items.length})</span>}
                </h1>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="animate-pulse">
                                <div className="bg-gray-200 rounded-lg h-52 mb-2" />
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <p className="text-gray-500 text-lg">Votre liste de favoris est vide.</p>
                        <Link href="/all-products" className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
                            Découvrir nos produits
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map((item) => {
                            const imgUrl = item.product_image ? resolveMediaUrl(item.product_image) : null;
                            const outOfStock = item.product_stock <= 0;
                            const inactive = !item.product_is_active;

                            return (
                                <div key={item.id} className={`flex gap-4 bg-white border border-gray-100 rounded-xl p-4 transition hover:shadow-md ${inactive ? 'opacity-50' : ''}`}>
                                    <Link
                                        href={`/product/${item.product}`}
                                        className="shrink-0 w-28 h-28 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center"
                                    >
                                        {imgUrl ? (
                                            <Image src={imgUrl} alt={item.product_name} width={112} height={112} className="object-cover w-full h-full" />
                                        ) : (
                                            <div className="text-gray-300 text-xs">No image</div>
                                        )}
                                    </Link>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <Link href={`/product/${item.product}`} className="text-sm font-medium text-gray-800 hover:text-orange-500 truncate">
                                            {item.product_name}
                                        </Link>
                                        <p className="text-sm font-semibold text-orange-600 mt-1">
                                            {formatPrice(item.product_offer_price || item.product_price)}
                                        </p>
                                        {outOfStock && (
                                            <span className="text-xs text-red-500 mt-1">Rupture de stock</span>
                                        )}
                                        {inactive && (
                                            <span className="text-xs text-gray-400 mt-1">Produit indisponible</span>
                                        )}
                                        <div className="flex items-center gap-2 mt-auto pt-2">
                                            {!outOfStock && !inactive && (
                                                <button
                                                    onClick={() => handleAddToCart(item)}
                                                    className="px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                                                >
                                                    Ajouter au panier
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRemove(item)}
                                                disabled={removing === item.id}
                                                className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition disabled:opacity-50"
                                            >
                                                {removing === item.id ? '…' : 'Supprimer'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
}
