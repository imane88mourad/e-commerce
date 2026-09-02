'use client'
import React, { useState, useEffect } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Navbar from "@/components/seller/Navbar";
import { sellerApi } from "@/lib/api/seller";

const AddProduct = () => {

  const { router, token } = useAppContext();

  const [files, setFiles] = useState([]);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [price, setPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [stock, setStock] = useState('');
  const [warranty, setWarranty] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    // Fetch categories and brands
    const fetchData = async () => {
      try {
        const [catData, brandData] = await Promise.all([
          sellerApi.getCategories(),
          sellerApi.getBrands(),
        ]);
        setCategories(catData.results || []);
        setBrands(brandData.results || []);
      } catch (err) {
        console.error('Failed to fetch categories/brands:', err);
      }
    };
    fetchData();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const productData = {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        sku: sku || `SKU-${Date.now()}`,
        description,
        short_description: shortDescription,
        price: parseFloat(price),
        promotional_price: offerPrice ? parseFloat(offerPrice) : null,
        stock: parseInt(stock) || 0,
        warranty: warranty || null,
        weight: weight ? parseFloat(weight) : null,
        dimensions: dimensions || null,
        is_active: isActive,
        is_featured: isFeatured,
        is_new: isNew,
        is_best_seller: isBestSeller,
        category_id: categoryId || null,
        brand_id: brandId || null,
      };

      const result = await sellerApi.createProduct(productData);
      setSuccess(`Product "${result.name}" created successfully!`);

      // Reset form
      setName('');
      setSku('');
      setDescription('');
      setShortDescription('');
      setCategoryId('');
      setBrandId('');
      setPrice('');
      setOfferPrice('');
      setStock('');
      setWarranty('');
      setWeight('');
      setDimensions('');
      setIsActive(true);
      setIsFeatured(false);
      setIsNew(false);
      setIsBestSeller(false);
      setFiles([]);
    } catch (err) {
      console.error('Failed to create product:', err);
      setError(err.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex flex-col justify-between">
      <Navbar />
      <form onSubmit={handleSubmit} className="md:p-10 p-4 space-y-5 max-w-lg">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div>
          <p className="text-base font-medium">Product Images</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {[...Array(4)].map((_, index) => (
              <label key={index} htmlFor={`image${index}`}>
                <input onChange={(e) => {
                  const updatedFiles = [...files];
                  updatedFiles[index] = e.target.files[0];
                  setFiles(updatedFiles);
                }} type="file" id={`image${index}`} hidden accept="image/*" />
                <Image
                  key={index}
                  className="max-w-24 cursor-pointer"
                  src={files[index] ? URL.createObjectURL(files[index]) : assets.upload_area}
                  alt=""
                  width={100}
                  height={100}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Note: Image upload requires separate ProductImage API (coming soon)</p>
        </div>

        <div className="flex flex-col gap-1 max-w-md">
          <label className="text-base font-medium" htmlFor="product-name">
            Product Name *
          </label>
          <input
            id="product-name"
            type="text"
            placeholder="Type here"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
            onChange={(e) => setName(e.target.value)}
            value={name}
            required
          />
        </div>

        <div className="flex flex-col gap-1 max-w-md">
          <label className="text-base font-medium" htmlFor="product-sku">
            SKU
          </label>
          <input
            id="product-sku"
            type="text"
            placeholder="Auto-generated if empty"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
            onChange={(e) => setSku(e.target.value)}
            value={sku}
          />
        </div>

        <div className="flex flex-col gap-1 max-w-md">
          <label className="text-base font-medium" htmlFor="product-description">
            Product Description
          </label>
          <textarea
            id="product-description"
            rows={4}
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40 resize-none"
            placeholder="Type here"
            onChange={(e) => setDescription(e.target.value)}
            value={description}
            required
          ></textarea>
        </div>

        <div className="flex flex-col gap-1 max-w-md">
          <label className="text-base font-medium" htmlFor="product-short-desc">
            Short Description
          </label>
          <input
            id="product-short-desc"
            type="text"
            placeholder="Brief summary"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
            onChange={(e) => setShortDescription(e.target.value)}
            value={shortDescription}
          />
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex flex-col gap-1 w-40">
            <label className="text-base font-medium" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setCategoryId(e.target.value)}
              value={categoryId}
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-40">
            <label className="text-base font-medium" htmlFor="brand">
              Brand
            </label>
            <select
              id="brand"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setBrandId(e.target.value)}
              value={brandId}
            >
              <option value="">Select Brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="product-price">
              Product Price *
            </label>
            <input
              id="product-price"
              type="number"
              step="0.01"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setPrice(e.target.value)}
              value={price}
              required
            />
          </div>
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="offer-price">
              Promotional Price
            </label>
            <input
              id="offer-price"
              type="number"
              step="0.01"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setOfferPrice(e.target.value)}
              value={offerPrice}
            />
          </div>
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="stock">
              Stock *
            </label>
            <input
              id="stock"
              type="number"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={(e) => setStock(e.target.value)}
              value={stock}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="warranty">Warranty</label>
            <input id="warranty" type="text" placeholder="e.g. 1 year" className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40" onChange={(e) => setWarranty(e.target.value)} value={warranty} />
          </div>
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="weight">Weight (kg)</label>
            <input id="weight" type="number" step="0.01" placeholder="0" className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40" onChange={(e) => setWeight(e.target.value)} value={weight} />
          </div>
          <div className="flex flex-col gap-1 w-40">
            <label className="text-base font-medium" htmlFor="dimensions">Dimensions</label>
            <input id="dimensions" type="text" placeholder="e.g. 30x20x10 cm" className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40" onChange={(e) => setDimensions(e.target.value)} value={dimensions} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Featured</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">New</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Best Seller</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-8 py-2.5 bg-orange-600 text-white font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'ADD PRODUCT'}
        </button>
      </form>
    </div>
  );
};

export default AddProduct;
