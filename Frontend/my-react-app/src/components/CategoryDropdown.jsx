import { useState } from "react";
import { useNavigate } from "react-router-dom";

const categories = [
  "Electronics",
  "Fashion",
  "Home Appliances",
  "Sports",
  "Beauty",
  "Books",
  "Others"
];

const CategoryDropdown = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSelect = (category) => {
    setOpen(false);
    navigate(`/products?category=${category.toLowerCase()}`);
  };

  return (
    <div className="relative w-64">
      {/* Dropdown Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg shadow flex justify-between items-center"
      >
        Browse Categories
        <span className="ml-2">▾</span>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg z-50">
          {categories.map((cat) => (
            <div
              key={cat}
              onClick={() => handleSelect(cat)}
              className="px-4 py-2 hover:bg-blue-100 cursor-pointer transition"
            >
              {cat}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryDropdown;
