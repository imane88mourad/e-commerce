import React from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";
import Loading from "./Loading";

const FeaturedProduct = () => {
  const { products, loading } = useAppContext();

  if (loading) {
    return <Loading />;
  }

  // Get featured products (is_featured = true)
  const featuredProducts = products.filter(product => product.is_featured).slice(0, 3);

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <div className="mt-14">
      <div className="flex flex-col items-center">
        <p className="text-3xl font-medium">Featured Products</p>
        <div className="w-28 h-0.5 bg-orange-600 mt-2"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-14 mt-12 md:px-14 px-4">
        {featuredProducts.map((product) => (
          <div key={product._id} className="relative group">
            <Image
              src={product.image && product.image.length > 0 ? product.image[0] : assets.girl_with_headphone_image}
              alt={product.name}
              className="group-hover:brightness-75 transition duration-300 w-full h-auto object-cover"
            />
            <div className="group-hover:-translate-y-4 transition duration-300 absolute bottom-8 left-8 text-white space-y-2">
              <p className="font-medium text-xl lg:text-2xl">{product.name}</p>
              <p className="text-sm lg:text-base leading-5 max-w-60">
                {product.short_description || product.description || ''}
              </p>
              <button onClick={() => window.location.href = `/product/${product._id}`} className="flex items-center gap-1.5 bg-orange-600 px-4 py-2 rounded">
                Buy now <Image className="h-3 w-3" src={assets.redirect_icon} alt="Redirect Icon" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturedProduct;
