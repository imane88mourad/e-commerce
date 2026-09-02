'use client'
import React, { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Loading from "@/components/Loading";
import { useAppContext } from "@/context/AppContext";
import { productsApi } from "@/lib/api/products";
import { useParams } from "next/navigation";
import { mapProducts } from "@/lib/transformers";

const PRODUCTS_PER_PAGE = 12;

const CategoryPage = () => {
    const { slug } = useParams();
    const { categories, brands, router } = useAppContext();
    const [categoryProducts, setCategoryProducts] = useState([]);
    const [category, setCategory] = useState(null);
    const [parentCategory, setParentCategory] = useState(null);
    const [subCategories, setSubCategories] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedBrand, setSelectedBrand] = useState('');
    const [sortBy, setSortBy] = useState('-created_at');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageLoading, setPageLoading] = useState(true);
    const [pageError, setPageError] = useState(null);

    useEffect(() => {
        setCurrentPage(1);
    }, [slug, selectedBrand, sortBy]);

    useEffect(() => {
        const findCategory = () => {
            if (!slug || categories.length === 0) return;
            let found = categories.find(c => c.slug === slug);
            if (!found) return;
            setCategory(found);
            setSubCategories(found.children || []);
            if (found.parent) {
                const parent = categories.find(c => c.id === found.parent);
                setParentCategory(parent || null);
            } else {
                setParentCategory(null);
            }
        };
        findCategory();
    }, [slug, categories]);

    useEffect(() => {
        const fetchCategoryProducts = async () => {
            let currentCategory = category;
            if (!currentCategory && categories.length === 0 && slug) {
                try {
                    const catData = await productsApi.getCategories();
                    const allCategories = catData.results || [];
                    currentCategory = allCategories.find(c => c.slug === slug);
                    if (!currentCategory) {
                        setPageError('Category not found');
                        setPageLoading(false);
                        return;
                    }
                    setCategory(currentCategory);
                    setSubCategories(currentCategory.children || []);
                    if (currentCategory.parent) {
                        const parent = allCategories.find(c => c.id === currentCategory.parent);
                        setParentCategory(parent || null);
                    }
                } catch (err) {
                    setPageError(err.message);
                    setPageLoading(false);
                    return;
                }
            }
            if (!currentCategory) return;

            try {
                setPageLoading(true);
                setPageError(null);
                const params = { category: currentCategory.id };
                if (selectedBrand) params.brand = selectedBrand;
                if (sortBy) params.ordering = sortBy;
                params.page = currentPage;
                params.page_size = PRODUCTS_PER_PAGE;

                const data = await productsApi.getAll(params);
                const mapped = mapProducts(data.results);
                setCategoryProducts(mapped);
                setTotalCount(data.count || 0);
                if (mapped.length > 0 && mapped[0].category && !category) {
                    setCategory(prev => prev ? prev : { name: mapped[0].category });
                }
            } catch (err) {
                console.error('Failed to fetch category products:', err);
                setPageError(err.message);
            } finally {
                setPageLoading(false);
            }
        };

        if (slug && (category || categories.length === 0)) {
            fetchCategoryProducts();
        }
    }, [slug, category, categories, selectedBrand, sortBy, currentPage]);

    const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubCategory = (subSlug) => {
        router.push(`/category/${subSlug}`);
    };

    if (pageError) {
        return (
            <>
                <Navbar />
                <div className="flex flex-col items-center justify-center px-6 md:px-16 lg:px-32 pt-14">
                    <p className="text-red-500 text-lg">Error loading category: {pageError}</p>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="flex flex-col items-start px-6 md:px-16 lg:px-32">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mt-6 text-sm text-gray-500">
                    <button onClick={() => router.push('/all-products')} className="hover:text-orange-600 transition">
                        Catalogue
                    </button>
                    {parentCategory && (
                        <>
                            <span>/</span>
                            <button
                                onClick={() => router.push(`/category/${parentCategory.slug}`)}
                                className="hover:text-orange-600 transition"
                            >
                                {parentCategory.name}
                            </button>
                        </>
                    )}
                    <span>/</span>
                    <span className="text-gray-800">{category?.name || '...'}</span>
                </div>

                <div className="flex flex-col items-end pt-6">
                    <p className="text-2xl font-medium">
                        {category?.name || 'Category'}
                    </p>
                    <div className="w-16 h-0.5 bg-orange-600 rounded-full"></div>
                    {totalCount > 0 && (
                        <p className="text-sm text-gray-500 mt-1">{totalCount} product{totalCount !== 1 ? 's' : ''}</p>
                    )}
                </div>

                {/* Sub-categories */}
                {subCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-6">
                        {subCategories.map((sub) => (
                            <button
                                key={sub.id}
                                onClick={() => handleSubCategory(sub.slug)}
                                className={`px-4 py-1.5 border rounded-full text-sm transition ${
                                    slug === sub.slug
                                        ? 'border-orange-600 bg-orange-50 text-orange-600'
                                        : 'border-gray-300 hover:border-gray-400'
                                }`}
                            >
                                {sub.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mt-6 w-full">
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

                {pageLoading ? (
                    <Loading />
                ) : categoryProducts.length === 0 ? (
                    <p className="text-gray-500 mt-12">No products found in this category.</p>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 flex-col items-center gap-6 mt-12 pb-8 w-full">
                            {categoryProducts.map((product, index) => (
                                <ProductCard key={product._id || index} product={product} />
                            ))}
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

export default CategoryPage;
