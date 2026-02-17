// src/pages/ProductDetails.jsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchProductDetails } from "../services/productService";

const ProductDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await fetchProductDetails(id);
      setData(response);
    } catch (err) {
      console.error("❌ Product details error:", err);
      setError("Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <p className="text-blue-400 text-center mt-10">
        Loading product details...
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-red-400 text-center mt-10">
        {error}
      </p>
    );
  }

  if (!data) return null;

  const { product, offers } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050B2E] via-[#081A4A] to-[#020617] text-white px-6 py-8">

      {/* Product Info */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">

        {/* Image */}
        <div>
          <img
            src={product.image}
            alt={product.productName}
            className="w-full rounded-xl shadow-lg"
          />
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {product.productName}
          </h1>

          <p className="text-gray-400 mb-4">
            Category: {product.category}
          </p>

          <p className="text-gray-300 mb-6">
            {product.description || "No description available"}
          </p>

          <div className="text-sm text-gray-400">
            {offers.length} sellers available
          </div>
        </div>
      </div>

      {/* Seller Offers */}
      <div className="max-w-5xl mx-auto mt-12">
        <h2 className="text-xl font-semibold mb-4">
          Available Sellers
        </h2>

        {offers.length === 0 ? (
          <p className="text-red-400">
            Currently unavailable from all sellers
          </p>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <div
                key={offer._id}
                className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {offer.sellerName}
                  </p>
                  <p className="text-sm text-gray-400">
                    Warranty: {offer.warranty}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <p className="font-bold text-green-400">
                    Rs. {offer.price.toLocaleString()}
                  </p>

                  <button
                    onClick={() =>
                      console.log(
                        "Add to cart → sellerOfferId:",
                        offer._id
                      )
                    }
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
