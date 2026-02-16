import ProductCard from "./ProductCard";

/**
 * @param {Array} products - real products from backend
 * @param {Boolean} loading
 * @param {String} error
 */
const ProductGrid = ({ products, loading, error }) => {
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
  if (!products || products.length === 0) {
    return (
      <p className="text-gray-400 text-center mt-10">
        No products found
      </p>
    );
  }

  // ✅ Normal product grid
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;
