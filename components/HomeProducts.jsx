import React from "react";
import ProductCard from "./ProductCard";
import { useAppContext } from "@/context/AppContext";
import Loading from "./Loading";

const HomeProducts = () => {

  const { products, loading } = useAppContext()

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col items-center pt-14">
      <p className="text-2xl font-medium text-left w-full">Popular products</p>
      {products.length === 0 ? (
        <p className="text-gray-500 mt-6">No products available.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 flex-col items-center gap-6 mt-6 pb-14 w-full">
            {products.map((product, index) => <ProductCard key={product._id || index} product={product} />)}
          </div>
          <button className="px-12 py-2.5 border rounded text-gray-500/70 hover:bg-slate-50/90 transition">
            See more
          </button>
        </>
      )}
    </div>
  );
};

export default HomeProducts;
