import React, { useState, useEffect } from 'react'
import { assets } from '@/assets/assets'
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { wishlistApi } from '@/lib/api/reviews';
import { formatPrice } from '@/lib/api/admin-products';
import { toast } from 'react-hot-toast';

const ProductCard = ({ product }) => {

    const { router, addToCart, user } = useAppContext()
    const { t, isRTL } = useLanguage();
    const [inWishlist, setInWishlist] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    useEffect(() => {
        if (user && product._id) {
            wishlistApi.check(product._id)
                .then((data) => setInWishlist(data.in_wishlist))
                .catch(() => {});
        }
    }, [user, product._id]);

    const handleWishlist = async (e) => {
        e.stopPropagation();
        if (!user) {
            toast.error(t('productCard.addToWishlist'));
            return;
        }
        if (wishlistLoading) return;
        setWishlistLoading(true);
        try {
            if (inWishlist) {
                await wishlistApi.remove(product._id);
                setInWishlist(false);
                toast.success(t('productCard.removedFromWishlist'));
            } else {
                await wishlistApi.add(product._id);
                setInWishlist(true);
                toast.success(t('productCard.addedToWishlist'));
            }
        } catch (err) {
            toast.error(err.message || t('error'));
        } finally {
            setWishlistLoading(false);
        }
    };

    const imageSrc = product.image && product.image.length > 0
        ? product.image[0]
        : assets.apple_earphone_image;

    return (
        <div
            onClick={() => { router.push('/product/' + product._id); scrollTo(0, 0) }}
            className={`flex flex-col items-start gap-0.5 max-w-[200px] w-full cursor-pointer ${isRTL ? 'items-end text-right' : ''}`}
        >
            <div className="cursor-pointer group relative bg-gray-500/10 rounded-lg w-full h-52 flex items-center justify-center">
                <Image
                    src={imageSrc}
                    alt={product.name}
                    className="group-hover:scale-105 transition object-cover w-4/5 h-4/5 md:w-full md:h-full"
                    width={800}
                    height={800}
                />
                {/* Badges */}
                <div className={`absolute top-2 flex flex-col gap-1 ${isRTL ? 'right-2' : 'left-2'}`}>
                    {product.isNew && (
                        <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded">{t('productCard.new')}</span>
                    )}
                    {product.isBestSeller && (
                        <span className="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded">{t('productCard.bestSeller')}</span>
                    )}
                </div>
                <button
                    onClick={handleWishlist}
                    className={`absolute top-2 bg-white p-2 rounded-full shadow-md transition hover:scale-110 ${isRTL ? 'left-2' : 'right-2'}`}
                    disabled={wishlistLoading}
                    title={inWishlist ? t('productCard.removeFromWishlist') : t('productCard.addToWishlist')}
                >
                    {inWishlist ? (
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    ) : (
                        <Image
                            className="h-3 w-3"
                            src={assets.heart_icon}
                            alt="heart_icon"
                        />
                    )}
                </button>
            </div>

            <p className="md:text-base font-medium pt-2 w-full truncate">{product.name}</p>
            <p className="w-full text-xs text-gray-500/70 max-sm:hidden truncate">{product.shortDescription || product.description}</p>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <p className="text-xs">{product.rating || 4.5}</p>
                <div className={`flex items-center gap-0.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {Array.from({ length: 5 }).map((_, index) => (
                        <Image
                            key={index}
                            className="h-3 w-3"
                            src={
                                index < Math.floor(product.rating || 4)
                                    ? assets.star_icon
                                    : assets.star_dull_icon
                            }
                            alt="star_icon"
                        />
                    ))}
                </div>
            </div>

            <div className={`flex items-end justify-between w-full mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <p className="text-base font-medium">{formatPrice(product.offerPrice || product.price)}</p>
                    {product.oldPrice && (
                        <p className="text-xs text-gray-500 line-through">{formatPrice(product.oldPrice)}</p>
                    )}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); addToCart(product._id); }}
                    className=" max-sm:hidden px-4 py-1.5 text-gray-500 border border-gray-500/20 rounded-full text-xs hover:bg-slate-50 transition"
                >
                    {t('productCard.buyNow')}
                </button>
            </div>
        </div>
    )
}

export default ProductCard
