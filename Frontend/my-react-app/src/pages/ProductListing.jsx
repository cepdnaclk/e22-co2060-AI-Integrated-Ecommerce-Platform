import { useEffect, useState } from "react";
import { fetchProducts } from "../services/productService";
import FilterSidebar from "../components/FilterSidebar";
import ProductGrid from "../components/ProductGrid";

const ProductListing = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(null);
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalProducts, setTotalProducts] = useState(0);

  /* 🔄 Load products (browse + search) */
  useEffect(() => {
    const delay = setTimeout(() => {
      loadProducts();
    }, 400); // debounce

    return () => clearTimeout(delay);
  }, [search, category, sort, page]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await fetchProducts({
        search: search.trim() || undefined,
        category,
        sort,
        page,
        limit: 8
      });

      setProducts(data?.products || []);
      setTotalProducts(data?.totalProducts || 0);
    } catch (err) {
      console.error("❌ Product load error:", err);
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050B2E] via-[#081A4A] to-[#020617] text-white px-6 py-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Browse Products</h1>
        <p className="text-gray-400 text-sm">
          Compare prices from multiple sellers
        </p>
      </div>

      <div className="flex gap-6">

        {/* Sidebar */}
        <FilterSidebar
          setSearch={(val) => {
            setSearch(val);
            setPage(1); // reset page on new search
          }}
          setCategory={(val) => {
            setCategory(val);
            setPage(1);
          }}
        />

        {/* Main */}
        <main className="flex-1">

          {/* Sort Bar */}
          <div className="flex items-center justify-between mb-6 bg-white/5 backdrop-blur border border-white/10 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Sort by</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="bg-white/10 border border-white/10 px-3 py-1 rounded-lg text-sm"
              >
                <option value="latest">Latest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </div>
            <p className="text-sm text-gray-400">
              {totalProducts} Results
            </p>
          </div>

          {/* Product Grid */}
          <ProductGrid
            products={products}
            loading={loading}
            error={error}
          />

          {/* Pagination */}
          {!search && totalProducts > 8 && (
            <div className="flex justify-center gap-3 mt-10">
              {Array.from(
                { length: Math.ceil(totalProducts / 8) },
                (_, i) => i + 1
              ).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-4 py-2 rounded-lg ${
                    page === p
                      ? "bg-blue-500"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default ProductListing;
