import ProductCard from "./ProductCard";

/**
 * @param {Array} products - real products from backend
 * @param {Boolean} loading
 * @param {String} error
 */
const ProductGrid = ({ products, loading, error }) => {
  // Sample fallback products
  const sampleProducts = [
    {
      _id: "1",
      productName: "Wireless Headphones",
      sellerName: "Tech World",
      price: 12999,
      isAvailable: true,
      image: "https://picsum.photos/300/200?1",
    },
    {
      _id: "2",
      productName: "Smart Watch",
      sellerName: "Gadget Hub",
      price: 24999,
      isAvailable: true,
      image: "https://picsum.photos/300/200?2",
    },
    {
      _id: "3",
      productName: "Running Sneakers",
      sellerName: "Sporty",
      price: 7999,
      isAvailable: false,
      image: "https://picsum.photos/300/200?3",
    },
    {
      _id: "4",
      productName: "DSLR Camera",
      sellerName: "Camera Pro",
      price: 189999,
      isAvailable: true,
      image: "https://picsum.photos/300/200?4",
    },
  ];

  if (loading) {
    return <p className="text-blue-400">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  const dataToRender = products.length > 0 ? products : sampleProducts;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {dataToRender.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;
