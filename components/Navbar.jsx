"use client"
import React, { useState } from "react";
import { assets } from "@/assets/assets";
import Link from "next/link"
import { useAppContext } from "@/context/AppContext";
import Image from "next/image";

const Navbar = () => {

  const { isSeller, router, categories, token, userData, logout } = useAppContext();
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
    <nav className="flex items-center justify-between px-6 md:px-16 lg:px-32 py-3 border-b border-gray-300 text-gray-700">
      <Image
        className="cursor-pointer w-28 md:w-32"
        onClick={() => router.push('/')}
        src={assets.logo}
        alt="logo"
      />
      <div className="hidden md:flex items-center gap-4 lg:gap-8">
        <Link href="/" className="hover:text-gray-900 transition">
          Home
        </Link>
        <div
          className="relative"
          onMouseEnter={() => setCategoriesOpen(true)}
          onMouseLeave={() => setCategoriesOpen(false)}
        >
          <button className="hover:text-gray-900 transition flex items-center gap-1">
            Categories
          </button>
          {categoriesOpen && categories.length > 0 && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px] z-50">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="block px-4 py-2 hover:bg-gray-100 transition text-sm"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <Link href="/all-products" className="hover:text-gray-900 transition">
          Shop
        </Link>
        <Link href="/" className="hover:text-gray-900 transition">
          About Us
        </Link>
        <Link href="/" className="hover:text-gray-900 transition">
          Contact
        </Link>

        {isSeller && <button onClick={() => router.push('/seller')} className="text-xs border px-4 py-1.5 rounded-full">Seller Dashboard</button>}
      </div>

      <ul className="hidden md:flex items-center gap-4 ">
        {/* Desktop Search */}
        <form onSubmit={handleSearch} className="flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-32 lg:w-48 px-3 py-1 text-sm border border-gray-300 rounded-l focus:outline-none focus:border-orange-600 transition"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-orange-600 text-white rounded-r hover:bg-orange-700 transition"
          >
            <Image className="w-4 h-4" src={assets.search_icon} alt="search" />
          </button>
        </form>
        <button onClick={() => router.push('/cart')} className="relative hover:text-gray-900 transition">
          <Image className="w-5 h-5" src={assets.cart_icon} alt="cart" />
        </button>
        {token ? (
          <>
            <button onClick={() => router.push('/account')} className="flex items-center gap-2 hover:text-gray-900 transition">
              <Image src={assets.user_icon} alt="user icon" />
              {userData?.full_name?.split(' ')[0] || 'Account'}
            </button>
            <button onClick={logout} className="text-sm hover:text-gray-900 transition">
              Logout
            </button>
          </>
        ) : (
          <button onClick={() => router.push('/login')} className="flex items-center gap-2 hover:text-gray-900 transition">
            <Image src={assets.user_icon} alt="user icon" />
            Account
          </button>
        )}
      </ul>

      {/* Mobile Search Toggle */}
      <div className="flex items-center md:hidden gap-3">
        <button onClick={() => setMobileSearchOpen(!mobileSearchOpen)}>
          <Image className="w-5 h-5" src={assets.search_icon} alt="search" />
        </button>
        {isSeller && <button onClick={() => router.push('/seller')} className="text-xs border px-4 py-1.5 rounded-full">Seller Dashboard</button>}
        {token ? (
          <>
            <button onClick={() => router.push('/account')} className="flex items-center gap-2 hover:text-gray-900 transition">
              <Image src={assets.user_icon} alt="user icon" />
            </button>
            <button onClick={logout} className="text-sm hover:text-gray-900 transition">
              Logout
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
