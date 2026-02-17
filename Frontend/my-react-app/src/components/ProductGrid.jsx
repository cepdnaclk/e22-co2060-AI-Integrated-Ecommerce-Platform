import ProductCard from "./ProductCard";

/**
 * @param {Array} products - products from backend
 * Each product contains:
 *  - _id
 *  - productName
 *  - image
 *  - minPrice
 *  - sellerCount
 * @param {Boolean} loading
 * @param {String} error
 */
const ProductGrid = ({ products = [], loading = false, error = "" }) => {
  // 🔄 Loading state
  if (loading) {
    return (
      <p className="text-blue-400 text-center mt-10">
        Loading products...
      </p>
    );
  }

  // ❌ Error state
  if (error) {
    return (
      <p className="text-red-400 text-center mt-10">
        {error}
      </p>
    );
  }

  // 🚫 No products found
  if (products.length === 0) {
    return (
      <p className="text-gray-400 text-center mt-10">
        No products available
      </p>
    );
  }

  // ✅ Marketplace product grid
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={{
            ...product,
            minPrice: product.minPrice ?? null,
            sellerCount: product.sellerCount ?? 0
          }}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
