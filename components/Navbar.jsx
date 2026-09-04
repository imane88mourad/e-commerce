"use client"
import React, { useState } from "react";
import { assets } from "@/assets/assets";
import Link from "next/link"
import { useAppContext } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Image from "next/image";

const Navbar = () => {

  const { isSeller, router, categories, token, userData, logout } = useAppContext();
  const { t, isRTL } = useLanguage();
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setSearchQuery('');
      setMobileSearchOpen(false);
    }
  };

  return (
    <nav className={`flex items-center justify-between px-6 md:px-16 lg:px-32 py-3 border-b border-gray-300 text-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <Image
        className="cursor-pointer w-28 md:w-32"
        onClick={() => router.push('/')}
        src={assets.logo}
        alt="logo"
      />
      <div className="hidden md:flex items-center gap-4 lg:gap-8">
        <Link href="/" className="hover:text-gray-900 transition">
          {t('nav.home')}
        </Link>
        <div
          className="relative"
          onMouseEnter={() => setCategoriesOpen(true)}
          onMouseLeave={() => setCategoriesOpen(false)}
        >
          <button className="hover:text-gray-900 transition flex items-center gap-1">
            {t('nav.categories')}
          </button>
          {categoriesOpen && categories.length > 0 && (
            <div className={`absolute top-full ${isRTL ? 'right-0' : 'left-0'} mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px] z-50`}>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className={`block px-4 py-2 hover:bg-gray-100 transition text-sm ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <Link href="/all-products" className="hover:text-gray-900 transition">
          {t('nav.shop')}
        </Link>
        <Link href="/" className="hover:text-gray-900 transition">
          {t('nav.aboutUs')}
        </Link>
        <Link href="/" className="hover:text-gray-900 transition">
          {t('nav.contact')}
        </Link>

        {isSeller && <button onClick={() => router.push('/seller')} className="text-xs border px-4 py-1.5 rounded-full">{t('nav.sellerDashboard')}</button>}
      </div>

      <ul className={`hidden md:flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Desktop Search */}
        <form onSubmit={handleSearch} className="flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('nav.searchPlaceholder')}
            className={`w-32 lg:w-48 px-3 py-1 text-sm border border-gray-300 focus:outline-none focus:border-orange-600 transition ${isRTL ? 'rounded-r border-r-0' : 'rounded-l border-r-0'}`}
          />
          <button
            type="submit"
            className={`px-2 py-1 bg-orange-600 text-white hover:bg-orange-700 transition ${isRTL ? 'rounded-l' : 'rounded-r'}`}
          >
            <Image className="w-4 h-4" src={assets.search_icon} alt="search" />
          </button>
        </form>
        <button onClick={() => router.push('/cart')} className="relative hover:text-gray-900 transition">
          <Image className="w-5 h-5" src={assets.cart_icon} alt="cart" />
        </button>
        <LanguageSwitcher />
        {token ? (
          <>
            <button onClick={() => router.push('/account')} className="flex items-center gap-2 hover:text-gray-900 transition">
              <Image src={assets.user_icon} alt="user icon" />
              {userData?.full_name?.split(' ')[0] || t('nav.account')}
            </button>
            <button onClick={logout} className="text-sm hover:text-gray-900 transition">
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <button onClick={() => router.push('/login')} className="flex items-center gap-2 hover:text-gray-900 transition">
            <Image src={assets.user_icon} alt="user icon" />
            {t('nav.account')}
          </button>
        )}
      </ul>

      {/* Mobile Search Toggle */}
      <div className={`flex items-center md:hidden gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button onClick={() => setMobileSearchOpen(!mobileSearchOpen)}>
          <Image className="w-5 h-5" src={assets.search_icon} alt="search" />
        </button>
        <LanguageSwitcher />
        {isSeller && <button onClick={() => router.push('/seller')} className="text-xs border px-4 py-1.5 rounded-full">{t('nav.sellerDashboard')}</button>}
        {token ? (
          <>
            <button onClick={() => router.push('/account')} className="flex items-center gap-2 hover:text-gray-900 transition">
              <Image src={assets.user_icon} alt="user icon" />
            </button>
            <button onClick={logout} className="text-sm hover:text-gray-900 transition">
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <button onClick={() => router.push('/login')} className="flex items-center gap-2 hover:text-gray-900 transition">
            <Image src={assets.user_icon} alt="user icon" />
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
