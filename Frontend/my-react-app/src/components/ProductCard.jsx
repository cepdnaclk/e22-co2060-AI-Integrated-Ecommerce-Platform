import { useNavigate } from "react-router-dom";

const ProductCard = ({ product }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/products/${product._id}`)}
      className="border rounded-lg p-4 shadow hover:shadow-lg transition cursor-pointer"
    >
      <img
        src={product.image}
        alt={product.productName}
        className="w-full h-40 object-cover mb-3 rounded"
      />

      <h3 className="font-semibold text-lg">
        {product.productName}
      </h3>

      {/* ✅ Marketplace price */}
      {product.minPrice ? (
        <p className="font-bold text-green-600">
          From Rs. {product.minPrice.toLocaleString()}
        </p>
      ) : (
        <p className="text-red-500 text-sm">
          No sellers available
        </p>
      )}

      {/* ✅ Seller count */}
      <p className="text-sm text-gray-500 mt-1">
        {product.sellerCount || 0} sellers
      </p>

      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/products/${product._id}`);
        }}
        className="mt-3 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        View Sellers
      </button>
    </div>
  );
};

export default ProductCard;
