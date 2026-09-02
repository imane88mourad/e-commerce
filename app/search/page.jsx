'use client'
import React, { Suspense, useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Loading from "@/components/Loading";
import { useAppContext } from "@/context/AppContext";
import { productsApi } from "@/lib/api/products";
import { useSearchParams } from "next/navigation";
import { mapProducts } from "@/lib/transformers";

const PRODUCTS_PER_PAGE = 12;

const SearchContent = () => {
    const { categories, brands } = useAppContext();
    const [products, setProducts] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [sortBy, setSortBy] = useState('-created_at');
    const [currentPage, setCurrentPage] = useState(1);
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('q') || searchParams.get('search') || '';

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategory, selectedBrand, sortBy, searchQuery]);

    useEffect(() => {
        const fetchProducts = async () => {
            if (!searchQuery) {
                setProducts([]);
                setTotalCount(0);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setError(null);
                const params = { search: searchQuery };
                if (selectedCategory) params.category = selectedCategory;
                if (selectedBrand) params.brand = selectedBrand;
                if (sortBy) params.ordering = sortBy;
                params.page = currentPage;
                params.page_size = PRODUCTS_PER_PAGE;

                const data = await productsApi.getAll(params);
                setProducts(mapProducts(data.results));
                setTotalCount(data.count || 0);
            } catch (err) {
                console.error('Failed to fetch search results:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [selectedCategory, selectedBrand, sortBy, searchQuery, currentPage]);

    const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <>
            <Navbar />
            <div className="flex flex-col items-start px-6 md:px-16 lg:px-32">
                <div className="flex flex-col items-end pt-12">
                    <p className="text-2xl font-medium">
                        {searchQuery ? `Search results for: "${searchQuery}"` : 'Search'}
                    </p>
                    <div className="w-16 h-0.5 bg-orange-600 rounded-full"></div>
                    {totalCount > 0 && (
                        <p className="text-sm text-gray-500 mt-1">{totalCount} product{totalCount !== 1 ? 's' : ''} found</p>
                    )}
                </div>

                {!searchQuery && (
                    <p className="text-gray-500 mt-12">Enter a search term to find products.</p>
                )}

                {searchQuery && (
                    <div className="flex flex-wrap gap-4 mt-8 w-full">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2 border border-gray-500/30 rounded outline-none"
                        >
                            <option value="">All Categories</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedBrand}
                            onChange={(e) => setSelectedBrand(e.target.value)}
                            className="px-4 py-2 border border-gray-500/30 rounded outline-none"
                        >
                            <option value="">All Brands</option>
                            {brands.map((brand) => (
                                <option key={brand.id} value={brand.id}>
                                    {brand.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2 border border-gray-500/30 rounded outline-none"
                        >
                            <option value="-created_at">Newest</option>
                            <option value="price">Price: Low to High</option>
                            <option value="-price">Price: High to Low</option>
                            <option value="name">Name: A to Z</option>
                        </select>
                    </div>
                )}

                {loading ? (
                    <Loading />
                ) : error ? (
                    <p className="text-red-500 mt-12">Error loading search results: {error}</p>
                ) : products.length === 0 && searchQuery ? (
                    <p className="text-gray-500 mt-12">No products found for "{searchQuery}".</p>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 flex-col items-center gap-6 mt-12 pb-8 w-full">
                            {products.map((product, index) => <ProductCard key={product._id || index} product={product} />)}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 py-8 w-full">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 border rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                                >
                                    ← Prev
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`px-3 py-2 border rounded text-sm transition ${
                                            currentPage === page
                                                ? 'bg-orange-600 text-white border-orange-600'
                                                : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 border rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
            <Footer />
        </>
    );
};

export default function SearchPage() {
    return (
        <Suspense fallback={<><Navbar /><Loading /></>}>
            <SearchContent />
        </Suspense>
    );
}
