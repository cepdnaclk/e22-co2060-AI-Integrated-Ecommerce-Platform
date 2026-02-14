const FilterSidebar = ({ setSearch }) => {
  return (
    <aside className="hidden lg:block w-72 bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-5 space-y-6">

      <h3 className="text-lg font-semibold">Filters</h3>

      {/* Search */}
      <div>
        <p className="text-sm font-medium mb-2">Search</p>
        <input
          type="text"
          placeholder="Search products"
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Category */}
      <div>
        <p className="text-sm font-medium mb-2">Category</p>
        {["All", "Electronics", "Fashion", "Home & Garden"].map((item) => (
          <label key={item} className="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <input type="checkbox" className="accent-blue-500" />
            {item}
          </label>
        ))}
      </div>

    </aside>
  );
};

export default FilterSidebar;
