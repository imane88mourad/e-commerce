"use client"
import { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import ProductCard from "@/components/ProductCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import { useParams } from "next/navigation";
import Loading from "@/components/Loading";
import { useAppContext } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { productsApi } from "@/lib/api/products";
import { mapProduct, mapProducts } from "@/lib/transformers";
import { reviewsApi, wishlistApi } from "@/lib/api/reviews";
import { formatPrice } from "@/lib/api/admin-products";
import { toast } from "react-hot-toast";
import React from "react";

const STARS = [1, 2, 3, 4, 5];

function StarRating({ rating, size = 14 }) {
    return (
        <div className="flex items-center gap-0.5">
            {STARS.map((s) => (
                <svg key={s} width={size} height={size} viewBox="0 0 20 20" fill={s <= rating ? '#f59e0b' : 'none'} stroke={s <= rating ? '#f59e0b' : '#d1d5db'} strokeWidth="1.5">
                    <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.26l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.5z" />
                </svg>
            ))}
        </div>
    );
}

function ReviewForm({ productId, onSubmitted }) {
    const { user } = useAppContext();
    const { t, isRTL } = useLanguage();
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [hoveredStar, setHoveredStar] = useState(0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!comment.trim() || comment.trim().length < 10) {
            toast.error(t('product.reviewMinLength'));
            return;
        }
        setSubmitting(true);
        try {
            await reviewsApi.create({ product: productId, rating, title: title.trim(), comment: comment.trim() });
            toast.success(t('product.reviewSubmitted'));
            setComment('');
            setTitle('');
            setRating(5);
            if (onSubmitted) onSubmitted();
        } catch (err) {
            toast.error(err.message || t('error'));
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) {
        return (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-500 text-sm">{t('product.loginToReview')}</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={`bg-gray-50 rounded-lg p-6 space-y-4 ${isRTL ? 'text-right' : ''}`}>
            <h3 className="font-medium text-gray-800">{t('product.writeReview')}</h3>
            <div>
                <label className="text-sm text-gray-600 mb-2 block">{t('product.rating')}</label>
                <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    {STARS.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setRating(s)}
                            onMouseEnter={() => setHoveredStar(s)}
                            onMouseLeave={() => setHoveredStar(0)}
                            className="p-0.5"
                        >
                            <svg width={24} height={24} viewBox="0 0 20 20"
                                fill={s <= (hoveredStar || rating) ? '#f59e0b' : 'none'}
                                stroke={s <= (hoveredStar || rating) ? '#f59e0b' : '#d1d5db'}
                                strokeWidth="1.5">
                                <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.26l-4.94 2.6.94-5.5-4-3.9 5.53-.8L10 1.5z" />
                            </svg>
                        </button>
                    ))}
                    <span className={`text-sm text-gray-500 ${isRTL ? 'mr-2' : 'ml-2'}`}>{rating}/5</span>
                </div>
            </div>
            <div>
                <label className="text-sm text-gray-600 mb-1 block">{t('product.reviewTitle')}</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                    placeholder={t('product.reviewTitlePlaceholder')}
                />
            </div>
            <div>
                <label className="text-sm text-gray-600 mb-1 block">{t('product.reviewComment')}</label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
                    placeholder={t('product.reviewCommentPlaceholder')}
                    required
                />
            </div>
            <button
                type="submit"
                disabled={submitting || comment.trim().length < 10}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50"
            >
                {submitting ? t('product.submitting') : t('product.submitReview')}
            </button>
        </form>
    );
}

const Product = () => {

    const { id } = useParams();

    const { products, router, addToCart, currency, user } = useAppContext()
    const { t, isRTL } = useLanguage();

    const [mainImage, setMainImage] = useState(null);
    const [productData, setProductData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [similarProducts, setSimilarProducts] = useState([]);
    const [relatedProducts, setRelatedProducts] = useState([]);

    const [reviewStats, setReviewStats] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    const [inWishlist, setInWishlist] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    const fetchProductData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await productsApi.getById(id);
            const mappedProduct = mapProduct(data);
            setProductData(mappedProduct);
            const validImages = (mappedProduct.image || []).filter(img => img && img.trim() !== '');
            if (validImages.length > 0) {
                setMainImage(validImages[0]);
            }
            mappedProduct.image = validImages;
            if (mappedProduct.variants && mappedProduct.variants.length > 0) {
                setSelectedVariant(mappedProduct.variants[0]);
            }
            if (mappedProduct.categoryId) {
                try {
                    const similarData = await productsApi.getAll({ category: mappedProduct.categoryId });
                    const similar = mapProducts(similarData.results).filter(p => p.id !== mappedProduct.id);
                    setSimilarProducts(similar.slice(0, 5));
                } catch (e) { /* silent */ }
            }
            if (mappedProduct.brandId) {
                try {
                    const relatedData = await productsApi.getAll({ brand: mappedProduct.brandId });
                    const related = mapProducts(relatedData.results).filter(p => p.id !== mappedProduct.id);
                    setRelatedProducts(related.slice(0, 5));
                } catch (e) { /* silent */ }
            }
        } catch (err) {
            console.error('Failed to fetch product:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const fetchReviews = async () => {
        if (!id) return;
        setReviewsLoading(true);
        try {
            const [statsData, reviewsData] = await Promise.all([
                reviewsApi.stats(id),
                reviewsApi.listByProduct(id),
            ]);
            setReviewStats(statsData);
            setReviews(reviewsData.results || reviewsData || []);
        } catch (e) {
            console.error('Failed to fetch reviews:', e);
        } finally {
            setReviewsLoading(false);
        }
    };

    const checkWishlist = async () => {
        if (!user || !id) return;
        try {
            const data = await wishlistApi.check(id);
            setInWishlist(data.in_wishlist);
        } catch (e) { /* silent */ }
    };

    const toggleWishlist = async () => {
        if (!user) {
            toast.error(t('productCard.addToWishlist'));
            return;
        }
        setWishlistLoading(true);
        try {
            if (inWishlist) {
                await wishlistApi.remove(id);
                setInWishlist(false);
                toast.success(t('productCard.removedFromWishlist'));
            } else {
                await wishlistApi.add(id);
                setInWishlist(true);
                toast.success(t('productCard.addedToWishlist'));
            }
        } catch (err) {
            toast.error(err.message || t('error'));
        } finally {
            setWishlistLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchProductData();
            fetchReviews();
            checkWishlist();
        }
    }, [id, user]);

    if (loading) {
        return (
            <>
                <Navbar />
                <Loading />
            </>
        );
    }

    if (error || !productData) {
        return (
            <>
                <Navbar />
                <div className="flex flex-col items-center justify-center px-6 md:px-16 lg:px-32 pt-14">
                    <p className="text-red-500 text-lg">{error || t('notFound.message')}</p>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="px-6 md:px-16 lg:px-32 pt-14 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div className="px-5 lg:px-16 xl:px-20">
                        <div className="rounded-lg overflow-hidden bg-gray-500/10 mb-4">
                            {mainImage ? (
                                <Image
                                    src={mainImage}
                                    alt="alt"
                                    className="w-full h-auto object-cover mix-blend-multiply"
                                    width={1280}
                                    height={720}
                                />
                            ) : (
                                <div className="w-full aspect-video flex items-center justify-center text-gray-400">No image</div>
                            )}
                        </div>

                        {productData.image.length > 1 && (
                            <div className="grid grid-cols-4 gap-4">
                                {productData.image.map((image, index) => (
                                    <div
                                        key={index}
                                        onClick={() => setMainImage(image)}
                                        className="cursor-pointer rounded-lg overflow-hidden bg-gray-500/10"
                                    >
                                        <Image
                                            src={image}
                                            alt="alt"
                                            className="w-full h-auto object-cover mix-blend-multiply"
                                            width={1280}
                                            height={720}
                                        />
                                    </div>

                                ))}
                            </div>
                        )}
                    </div>

                    <div className={`flex flex-col ${isRTL ? 'text-right items-end' : ''}`}>
                        <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <h1 className="text-3xl font-medium text-gray-800/90">
                                {productData.name}
                            </h1>
                            <button
                                onClick={toggleWishlist}
                                disabled={wishlistLoading}
                                className="shrink-0 p-2 rounded-full transition hover:bg-gray-100"
                                title={inWishlist ? t('productCard.removeFromWishlist') : t('productCard.addToWishlist')}
                            >
                                {inWishlist ? (
                                    <svg width={24} height={24} viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                ) : (
                                    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <StarRating rating={Math.round(reviewStats?.average_rating || productData.rating || 0)} size={16} />
                            <p className="text-sm text-gray-500">
                                ({reviewStats?.average_rating?.toFixed(1) || productData.rating || '0'})
                                {reviewStats ? ` · ${reviewStats.total_reviews} ${t('product.reviews')}` : ''}
                            </p>
                        </div>
                        <p className="text-gray-600 mt-3">
                            {productData.description}
                        </p>
                        <p className="text-3xl font-medium mt-6">
                            {formatPrice(productData.offerPrice)}
                            {productData.oldPrice && (
                                <span className={`text-base font-normal text-gray-800/60 line-through ${isRTL ? 'mr-2' : 'ml-2'}`}>
                                    {formatPrice(productData.oldPrice)}
                                </span>
                            )}
                        </p>
                        <hr className="bg-gray-600 my-6" />
                        <div className="overflow-x-auto">
                            <table className="table-auto border-collapse w-full max-w-72">
                                <tbody>
                                    {productData.brand && (
                                        <tr>
                                            <td className="text-gray-600 font-medium">{t('product.brand')}</td>
                                            <td className="text-gray-800/50">{productData.brand}</td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td className="text-gray-600 font-medium">{t('product.category')}</td>
                                        <td className="text-gray-800/50">
                                            {productData.category}
                                        </td>
                                    </tr>
                                    {productData.warranty && (
                                        <tr>
                                            <td className="text-gray-600 font-medium">{t('product.warranty')}</td>
                                            <td className="text-gray-800/50">{productData.warranty}</td>
                                        </tr>
                                    )}
                                    {productData.stock !== undefined && (
                                        <tr>
                                            <td className="text-gray-600 font-medium">{t('product.stock')}</td>
                                            <td className="text-gray-800/50">{productData.stock > 0 ? t('product.inStock') : t('product.outOfStock')}</td>
                                        </tr>
                                    )}
                                    {productData.weight && (
                                        <tr>
                                            <td className="text-gray-600 font-medium">{t('product.weight')}</td>
                                            <td className="text-gray-800/50">{productData.weight} kg</td>
                                        </tr>
                                    )}
                                    {productData.dimensions && (
                                        <tr>
                                            <td className="text-gray-600 font-medium">{t('product.dimensions')}</td>
                                            <td className="text-gray-800/50">{productData.dimensions}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {productData.variants && productData.variants.length > 0 && (
                            <div className="mt-6">
                                <p className="text-gray-600 font-medium mb-2">{t('product.variants')}</p>
                                <div className="flex flex-wrap gap-2">
                                    {productData.variants.map((variant) => (
                                        <button
                                            key={variant.id}
                                            onClick={() => setSelectedVariant(variant)}
                                            className={`px-4 py-2 border rounded-lg text-sm transition ${
                                                selectedVariant?.id === variant.id
                                                    ? 'border-orange-600 bg-orange-50 text-orange-600'
                                                    : 'border-gray-300 hover:border-gray-400'
                                            }`}
                                        >
                                            {variant.name} {variant.price && `(+${currency}${variant.price})`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {productData.attributes && Object.keys(productData.attributes).length > 0 && (
                            <div className="mt-6">
                                <p className="text-gray-600 font-medium mb-2">{t('product.specifications')}</p>
                                <div className="bg-gray-500/5 rounded-lg p-4">
                                    {Object.entries(productData.attributes).map(([key, value]) => (
                                        <div key={key} className={`flex justify-between py-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                                            <span className="text-gray-800">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {productData.documents && productData.documents.length > 0 && (
                            <div className="mt-6">
                                <p className="text-gray-600 font-medium mb-2">{t('product.documents')}</p>
                                <div className="flex flex-wrap gap-2">
                                    {productData.documents.map((document) => (
                                        <a
                                            key={document.id}
                                            href={document.file}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 border rounded-lg text-sm text-gray-700 hover:border-orange-600 hover:text-orange-600 transition"
                                        >
                                            {document.name}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center mt-10 gap-4">
                            <button
                                onClick={() => addToCart(productData._id)}
                                className="w-full py-3.5 bg-gray-100 text-gray-800/80 hover:bg-gray-200 transition"
                                disabled={productData.stock === 0}
                            >
                                {productData.stock === 0 ? t('product.outOfStock') : t('product.addToCart')}
                            </button>
                            <button
                                onClick={() => { addToCart(productData._id); router.push('/checkout') }}
                                className="w-full py-3.5 bg-orange-500 text-white hover:bg-orange-600 transition"
                                disabled={productData.stock === 0}
                            >
                                {t('product.buyNow')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="mt-16">
                    <div className={`flex flex-col items-center mb-8 ${isRTL ? 'items-center' : ''}`}>
                        <p className="text-3xl font-medium">{t('product.customerReviews')}</p>
                        <div className="w-28 h-0.5 bg-orange-600 mt-2"></div>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-8">
                        {/* Review Stats */}
                        {reviewStats && reviewStats.total_reviews > 0 && (
                            <div className={`flex flex-col sm:flex-row items-center gap-8 bg-gray-50 rounded-lg p-6 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                                <div className="text-center">
                                    <p className="text-4xl font-bold text-gray-800">{reviewStats.average_rating?.toFixed(1) || '0'}</p>
                                    <StarRating rating={Math.round(reviewStats.average_rating || 0)} size={18} />
                                    <p className="text-sm text-gray-500 mt-1">{reviewStats.total_reviews} {t('product.reviews')}</p>
                                </div>
                                <div className="flex-1 w-full space-y-1">
                                    {[5, 4, 3, 2, 1].map((star) => {
                                        const count = reviewStats.distribution?.[String(star)] || 0;
                                        const pct = reviewStats.total_reviews > 0 ? (count / reviewStats.total_reviews) * 100 : 0;
                                        return (
                                            <div key={star} className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <span className="w-8 text-right text-gray-500">{star} ★</span>
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="w-10 text-xs text-gray-400">{Math.round(pct)}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Review Form */}
                        <ReviewForm productId={parseInt(id)} onSubmitted={fetchReviews} />

                        {/* Reviews List */}
                        {reviewsLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="animate-pulse bg-gray-50 rounded-lg p-4 space-y-3">
                                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                                        <div className="h-3 bg-gray-200 rounded w-full" />
                                    </div>
                                ))}
                            </div>
                        ) : reviews.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                                {t('product.noReviews')}
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {reviews.map((r) => (
                                    <div key={r.id} className={`bg-gray-50 rounded-lg p-5 ${isRTL ? 'text-right' : ''}`}>
                                        <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-medium">
                                                    {(r.user_name || r.user_email || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{r.user_name || r.user_email}</p>
                                                    <StarRating rating={r.rating} size={12} />
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        {r.title && <p className="text-sm font-medium text-gray-700 mb-1">{r.title}</p>}
                                        <p className="text-sm text-gray-600">{r.comment}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Similar Products */}
                {similarProducts.length > 0 && (
                    <div className="flex flex-col items-center">
                        <div className="flex flex-col items-center mb-4 mt-16">
                            <p className="text-3xl font-medium">{t('product.similarProducts')}</p>
                            <div className="w-28 h-0.5 bg-orange-600 mt-2"></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6 pb-14 w-full">
                            {similarProducts.map((product, index) => <ProductCard key={product._id || index} product={product} />)}
                        </div>
                    </div>
                )}

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <div className="flex flex-col items-center">
                        <div className="flex flex-col items-center mb-4 mt-16">
                            <p className="text-3xl font-medium">{t('product.relatedProducts')}</p>
                            <div className="w-28 h-0.5 bg-orange-600 mt-2"></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6 pb-14 w-full">
                            {relatedProducts.map((product, index) => <ProductCard key={product._id || index} product={product} />)}
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
};

export default Product;
