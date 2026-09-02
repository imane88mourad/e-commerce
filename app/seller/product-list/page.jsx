'use client'
import React, { useEffect, useState } from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Footer from "@/components/seller/Footer";
import Loading from "@/components/Loading";
import { sellerApi } from "@/lib/api/seller";
import { mapProducts } from "@/lib/transformers";

const ProductList = () => {

  const { router, token, currency } = useAppContext()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSellerProduct = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      setLoading(true);
      const data = await sellerApi.getProducts();
      setProducts(mapProducts(data.results));
    } catch (err) {
      console.error('Failed to fetch seller products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSellerProduct();
  }, [token])

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await sellerApi.deleteProduct(productId);
      setProducts(products.filter(p => p.id !== productId));
    } catch (err) {
      alert('Failed to delete product: ' + err.message);
    }
  }

  return (
    <div className="flex-1 min-h-screen flex flex-col justify-between">
      {loading ? <Loading /> : error ? (
        <div className="w-full md:p-10 p-4">
          <h2 className="pb-4 text-lg font-medium">All Products</h2>
          <p className="text-red-500">Error: {error}</p>
          <button onClick={() => { setError(null); fetchSellerProduct(); }} className="text-orange-600 hover:underline mt-2">
            Retry
          </button>
        </div>
      ) : (
        <div className="w-full md:p-10 p-4">
          <h2 className="pb-4 text-lg font-medium">All Product</h2>
          <div className="flex flex-col items-center max-w-4xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20">
            <table className=" table-fixed w-full overflow-hidden">
              <thead className="text-gray-900 text-sm text-left">
                <tr>
                  <th className="w-2/3 md:w-2/5 px-4 py-3 font-medium truncate">Product</th>
                  <th className="px-4 py-3 font-medium truncate max-sm:hidden">Category</th>
                  <th className="px-4 py-3 font-medium truncate">
                    Price
                  </th>
                  <th className="px-4 py-3 font-medium truncate max-sm:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-500">
                {products.map((product, index) => (
                  <tr key={product.id || index} className="border-t border-gray-500/20">
                    <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3 truncate">
                      <div className="bg-gray-500/10 rounded p-2">
                        <Image
                          src={product.image && product.image.length > 0 ? product.image[0] : assets.upload_area}
                          alt="product Image"
                          className="w-16"
                          width={1280}
                          height={720}
                        />
                      </div>
                      <span className="truncate w-full">
                        {product.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-sm:hidden">{product.category}</td>
                    <td className="px-4 py-3">{currency}{product.offerPrice}</td>
                    <td className="px-4 py-3 max-sm:hidden flex gap-2">
                      <button onClick={() => router.push(`/product/${product._id}`)} className="flex items-center gap-1 px-1.5 md:px-3.5 py-2 bg-orange-600 text-white rounded-md">
                        <span className="hidden md:block">Visit</span>
                        <Image
                          className="h-3.5"
                          src={assets.redirect_icon}
                          alt="redirect_icon"
                        />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="flex items-center gap-1 px-1.5 md:px-3.5 py-2 bg-red-600 text-white rounded-md">
                        <span className="hidden md:block">Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500">
                      No products found. Add your first product!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default ProductList;
