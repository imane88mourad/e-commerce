'use client'
import React, { useEffect, useState } from "react";
import HeaderSlider from "@/components/HeaderSlider";
import Banner from "@/components/Banner";
import NewsLetter from "@/components/NewsLetter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import Loading from "@/components/Loading";
import { productsApi } from "@/lib/api/products";
import { useAppContext } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { mapProducts } from "@/lib/transformers";

const Home = () => {
  const { categories } = useAppContext();
  const { t, isRTL } = useLanguage();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        const [allData, featured, newProductsData, bestSellersData] = await Promise.all([
          productsApi.getAll(),
          productsApi.getFeatured(),
          productsApi.getNew(),
          productsApi.getBestSellers(),
        ]);

        setAllProducts(mapProducts(allData.results));
        setFeaturedProducts(mapProducts(featured.results));
        setNewProducts(mapProducts(newProductsData.results));
        setBestSellers(mapProducts(bestSellersData.results));
      } catch (err) {
        console.error('Failed to fetch home data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <Loading />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="px-6 md:px-16 lg:px-32">
        <HeaderSlider />

        {/* Categories Section */}
        {categories.length > 0 && (
          <div className="flex flex-col items-center pt-14">
            <p className={`text-2xl font-medium w-full ${isRTL ? 'text-right' : 'text-left'}`}>{t('home.categories')}</p>
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 flex-col items-center gap-6 mt-6 pb-14 w-full ${isRTL ? 'text-right' : ''}`}>
              {categories.slice(0, 10).map((category, index) => (
                <div
                  key={category.id || index}
                  onClick={() => window.location.href = `/category/${category.slug}`}
                  className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition"
                >
                  <div className="w-20 h-20 rounded-full bg-gray-500/10 flex items-center justify-center">
                    <span className="text-2xl font-medium text-orange-600">
                      {category.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-center">{category.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Products */}
        {allProducts.length > 0 && (
          <div className="flex flex-col items-center pt-14">
            <p className={`text-2xl font-medium w-full ${isRTL ? 'text-right' : 'text-left'}`}>{t('home.allProducts')}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 flex-col items-center gap-6 mt-6 pb-14 w-full">
              {allProducts.slice(0, 10).map((product, index) => (
                <ProductCard key={product._id || index} product={product} />
              ))}
            </div>
            <button onClick={() => window.location.href = '/all-products'} className="px-8 py-2 mb-16 border rounded text-gray-500/70 hover:bg-slate-50/90 transition">
              {t('seeMore')}
            </button>
          </div>
        )}

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <div className="flex flex-col items-center pt-14">
            <p className={`text-2xl font-medium w-full ${isRTL ? 'text-right' : 'text-left'}`}>{t('home.featuredProducts')}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 flex-col items-center gap-6 mt-6 pb-14 w-full">
              {featuredProducts.slice(0, 5).map((product, index) => (
                <ProductCard key={product._id || index} product={product} />
              ))}
            </div>
            <button onClick={() => window.location.href = '/all-products?featured=true'} className="px-8 py-2 mb-16 border rounded text-gray-500/70 hover:bg-slate-50/90 transition">
              {t('seeMore')}
            </button>
          </div>
        )}

        {/* New Products */}
        {newProducts.length > 0 && (
          <div className="flex flex-col items-center pt-14">
            <p className={`text-2xl font-medium w-full ${isRTL ? 'text-right' : 'text-left'}`}>{t('home.newArrivals')}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 flex-col items-center gap-6 mt-6 pb-14 w-full">
              {newProducts.slice(0, 5).map((product, index) => (
                <ProductCard key={product._id || index} product={product} />
              ))}
            </div>
            <button onClick={() => window.location.href = '/all-products?new=true'} className="px-8 py-2 mb-16 border rounded text-gray-500/70 hover:bg-slate-50/90 transition">
              {t('seeMore')}
            </button>
          </div>
        )}

        {/* Best Sellers */}
        {bestSellers.length > 0 && (
          <div className="flex flex-col items-center pt-14">
            <p className={`text-2xl font-medium w-full ${isRTL ? 'text-right' : 'text-left'}`}>{t('home.bestSellers')}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 flex-col items-center gap-6 mt-6 pb-14 w-full">
              {bestSellers.slice(0, 5).map((product, index) => (
                <ProductCard key={product._id || index} product={product} />
              ))}
            </div>
            <button onClick={() => window.location.href = '/all-products?best_sellers=true'} className="px-8 py-2 mb-16 border rounded text-gray-500/70 hover:bg-slate-50/90 transition">
              {t('seeMore')}
            </button>
          </div>
        )}

        <Banner />
        <NewsLetter />
      </div>
      <Footer />
    </>
  );
};

export default Home;
