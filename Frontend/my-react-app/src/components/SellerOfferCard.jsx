const SellerOfferCard = ({ offer }) => {
  const product = offer.product; // from aggregation lookup

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 hover:bg-white/10 transition">

      {/* 🖼️ Product Image */}
      <img
        src={product.image}
        alt={product.productName}
        className="w-24 h-24 object-cover rounded-lg"
      />

      {/* 📦 Product & Seller Info */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold">
          {product.productName}
        </h3>

        <p className="text-sm text-gray-400">
          Seller: <span className="text-gray-300">{offer.sellerName}</span>
        </p>

        <p className="text-sm text-gray-400">
          Category: {product.category}
        </p>

        {offer.warranty && (
          <p className="text-xs text-gray-500 mt-1">
            Warranty: {offer.warranty}
          </p>
        )}
      </div>

      {/* 💰 Price + Action */}
      <div className="flex flex-col items-end justify-between">
        <p className="text-xl font-bold text-green-400">
          Rs. {offer.price.toLocaleString()}
        </p>

        <button
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
          onClick={() => console.log("Add to cart:", offer._id)}
        >
          Add to Cart
        </button>
      </div>

    </div>
  );
};

export default SellerOfferCard;