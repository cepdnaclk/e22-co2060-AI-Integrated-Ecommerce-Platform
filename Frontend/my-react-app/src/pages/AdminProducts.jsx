import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminMobileNav from "../components/AdminMobileNav";
import {
  fetchAdminProducts,
  updateProduct,
  deleteProduct,
  fetchVariantsByProduct,
  adminCreateVariant,
  updateVariant,
  deleteVariant,
} from "../services/productService";

const CATEGORIES = ["Electronics", "Fashion", "Home", "Beauty", "Sports", "Books", "Others"];

/* ── Style tokens ── */
const S = {
  pg: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #020617, #0f172a, #1e1b4b)",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    padding: "48px 32px",
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "24px 28px",
    backdropFilter: "blur(10px)",
  },
  input: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#fff",
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  label: {
    display: "block",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "#94a3b8",
    marginBottom: 6,
    fontWeight: 600,
  },
  btnPurple: {
    background: "linear-gradient(to right, #7e22ce, #a855f7)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    padding: "9px 18px",
  },
  btnGray: {
    background: "rgba(255,255,255,0.05)",
    color: "#94a3b8",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    padding: "9px 18px",
  },
  btnRed: {
    background: "rgba(239,68,68,0.15)",
    color: "#f87171",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    padding: "6px 12px",
  },
  btnBlue: {
    background: "rgba(59,130,246,0.15)",
    color: "#60a5fa",
    border: "1px solid rgba(59,130,246,0.3)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    padding: "6px 12px",
  },
  btnGreen: {
    background: "rgba(34,197,94,0.15)",
    color: "#4ade80",
    border: "1px solid rgba(34,197,94,0.3)",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    padding: "6px 12px",
  },
  overlay: {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(2,6,23,0.85)", backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  },
  modal: {
    background: "linear-gradient(135deg, #0f172a, #1e1b4b)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "32px 36px",
    width: "100%",
    maxWidth: 560,
    maxHeight: "90vh",
    overflowY: "auto",
  },
};

/* ─────────────────────────────────────────────────────────
 * Edit Product Modal
 * ───────────────────────────────────────────────────────── */
function EditProductModal({ product, onSave, onClose, loading }) {
  const [form, setForm] = useState({
    productName: product.productName || "",
    category: product.category || "",
    brand: product.brand || "",
    description: product.description || "",
    image: product.image || "",
  });

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 24px", color: "#fff" }}>✏️ Edit Product</h2>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={S.label}>Product Name *</label>
            <input style={{ ...S.input, width: "100%" }} name="productName" value={form.productName} onChange={handleChange} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={S.label}>Category *</label>
              <select style={{ ...S.input, width: "100%" }} name="category" value={form.category} onChange={handleChange}>
                <option value="">Select...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Brand</label>
              <input style={{ ...S.input, width: "100%" }} name="brand" value={form.brand} onChange={handleChange} placeholder="e.g. Apple" />
            </div>
          </div>
          <div>
            <label style={S.label}>Image URL</label>
            <input style={{ ...S.input, width: "100%" }} name="image" value={form.image} onChange={handleChange} placeholder="https://..." />
          </div>
          <div>
            <label style={S.label}>Description</label>
            <textarea style={{ ...S.input, width: "100%", minHeight: 90, resize: "vertical" }} name="description" value={form.description} onChange={handleChange} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 28 }}>
          <button style={S.btnGray} onClick={onClose} disabled={loading}>Cancel</button>
          <button style={{ ...S.btnPurple, opacity: loading ? 0.6 : 1 }} onClick={() => onSave(form)} disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * Delete Confirmation Modal
 * ───────────────────────────────────────────────────────── */
function DeleteModal({ name, onConfirm, onClose, loading }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
          <h2 style={{ fontSize: 20, color: "#fff", margin: "0 0 10px" }}>Delete Product?</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
            This will permanently delete <strong style={{ color: "#fff" }}>{name}</strong> along with all its seller offers. This action cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button style={S.btnGray} onClick={onClose} disabled={loading}>Cancel</button>
            <button style={{ background: "linear-gradient(to right,#dc2626,#ef4444)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, padding: "10px 24px", opacity: loading ? 0.6 : 1 }}
              onClick={onConfirm} disabled={loading}>
              {loading ? "Deleting…" : "Yes, Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * Variant Management Panel (expanded per product)
 * ───────────────────────────────────────────────────────── */
function VariantPanel({ productId, onToast }) {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVariant, setEditingVariant] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVariant, setNewVariant] = useState({ variantName: "", color: "", storage: "", size: "", image: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const loadVariants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVariantsByProduct(productId);
      setVariants(Array.isArray(data) ? data : []);
    } catch (e) { onToast(e.message, "error"); }
    setLoading(false);
  }, [productId, onToast]);

  useEffect(() => { loadVariants(); }, [loadVariants]);

  const handleEditVariant = (v) => { setEditingVariant(v._id); setEditForm({ variantName: v.variantName, color: v.color, storage: v.storage, size: v.size, image: v.image }); };

  const handleSaveVariant = async () => {
    setActionLoading(true);
    try {
      await updateVariant(productId, editingVariant, editForm);
      onToast("Variant updated!", "success");
      setEditingVariant(null);
      await loadVariants();
    } catch (e) { onToast(e.message, "error"); }
    setActionLoading(false);
  };

  const handleDeleteVariant = async (variantId, variantName) => {
    if (!window.confirm(`Delete variant "${variantName}"?`)) return;
    setActionLoading(true);
    try {
      await deleteVariant(productId, variantId);
      onToast("Variant deleted!", "success");
      await loadVariants();
    } catch (e) { onToast(e.message, "error"); }
    setActionLoading(false);
  };

  const handleAddVariant = async () => {
    if (!newVariant.variantName.trim()) { onToast("Variant name is required", "error"); return; }
    setActionLoading(true);
    try {
      await adminCreateVariant(productId, newVariant);
      onToast("Variant created!", "success");
      setShowAddForm(false);
      setNewVariant({ variantName: "", color: "", storage: "", size: "", image: "" });
      await loadVariants();
    } catch (e) { onToast(e.message, "error"); }
    setActionLoading(false);
  };

  if (loading) return <div style={{ padding: "16px 0", color: "#64748b", fontSize: 13 }}>Loading variants…</div>;

  return (
    <div style={{ padding: "16px 0 4px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#a855f7" }}>📦 Variants ({variants.length})</span>
        <button style={{ ...S.btnGreen, fontSize: 11 }} onClick={() => setShowAddForm((p) => !p)}>
          {showAddForm ? "✕ Cancel" : "+ Add Variant"}
        </button>
      </div>

      {/* Add Variant Form */}
      {showAddForm && (
        <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[["variantName", "Name *"], ["color", "Color"], ["storage", "Storage"], ["size", "Size"]].map(([k, lbl]) => (
              <div key={k}>
                <label style={{ ...S.label, fontSize: 10 }}>{lbl}</label>
                <input style={{ ...S.input, width: "100%", fontSize: 12, padding: "7px 10px" }} value={newVariant[k]} onChange={(e) => setNewVariant((p) => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ ...S.label, fontSize: 10 }}>Image URL</label>
            <input style={{ ...S.input, width: "100%", fontSize: 12, padding: "7px 10px" }} value={newVariant.image} onChange={(e) => setNewVariant((p) => ({ ...p, image: e.target.value }))} placeholder="https://..." />
          </div>
          <button style={{ ...S.btnGreen, opacity: actionLoading ? 0.6 : 1 }} onClick={handleAddVariant} disabled={actionLoading}>
            {actionLoading ? "Saving…" : "✓ Save Variant"}
          </button>
        </div>
      )}

      {/* Variant List */}
      {variants.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: 13, fontStyle: "italic" }}>No variants defined.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {variants.map((v) => (
            <div key={v._id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px" }}>
              {editingVariant === v._id ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                    {[["variantName", "Name *"], ["color", "Color"], ["storage", "Storage"], ["size", "Size"]].map(([k, lbl]) => (
                      <div key={k}>
                        <label style={{ ...S.label, fontSize: 10 }}>{lbl}</label>
                        <input style={{ ...S.input, width: "100%", fontSize: 12, padding: "7px 10px" }} value={editForm[k]} onChange={(e) => setEditForm((p) => ({ ...p, [k]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ ...S.label, fontSize: 10 }}>Image URL</label>
                    <input style={{ ...S.input, width: "100%", fontSize: 12, padding: "7px 10px" }} value={editForm.image} onChange={(e) => setEditForm((p) => ({ ...p, image: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...S.btnGray, fontSize: 11, padding: "5px 12px" }} onClick={() => setEditingVariant(null)}>Cancel</button>
                    <button style={{ ...S.btnPurple, fontSize: 11, padding: "5px 12px", opacity: actionLoading ? 0.6 : 1 }} onClick={handleSaveVariant} disabled={actionLoading}>Save</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {v.image && <img src={v.image} alt={v.variantName} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} onError={(e) => { e.target.style.display = "none"; }} />}
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{v.variantName}</span>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        {[v.color, v.storage, v.size].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={S.btnBlue} onClick={() => handleEditVariant(v)}>Edit</button>
                    <button style={S.btnRed} onClick={() => handleDeleteVariant(v._id, v.variantName)}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * Main AdminProducts page
 * ───────────────────────────────────────────────────────── */
export default function AdminProducts() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadProducts = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: 20, search, ...(categoryFilter !== "all" ? { category: categoryFilter } : {}) };
      const data = await fetchAdminProducts(params);
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
    } catch (e) { showToast(e.message, "error"); }
    setLoading(false);
  }, [search, categoryFilter, showToast]);

  useEffect(() => { loadProducts(1); }, [loadProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const handleEditSave = async (form) => {
    setActionLoading(true);
    try {
      await updateProduct(editingProduct._id, form);
      showToast("Product updated successfully!", "success");
      setEditingProduct(null);
      await loadProducts(currentPage);
    } catch (e) { showToast(e.message, "error"); }
    setActionLoading(false);
  };

  const handleDeleteConfirm = async () => {
    setActionLoading(true);
    try {
      await deleteProduct(deletingProduct._id);
      showToast("Product deleted successfully!", "success");
      setDeletingProduct(null);
      if (expandedProduct === deletingProduct._id) setExpandedProduct(null);
      await loadProducts(currentPage);
    } catch (e) { showToast(e.message, "error"); }
    setActionLoading(false);
  };

  const toggleExpand = (id) => setExpandedProduct((prev) => (prev === id ? null : id));

  const LIMIT = 20;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e1b4b] text-white font-sans p-4 sm:p-8 md:p-12 relative overflow-x-hidden">
      
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
        .ap-row:hover { background: rgba(168,85,247,0.04); }
        select option { background: #1e1b4b; color: #fff; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl border backdrop-blur-xl animate-toastIn shadow-xl
          ${toast.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}
        `}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {editingProduct && (
        <EditProductModal product={editingProduct} onSave={handleEditSave} onClose={() => setEditingProduct(null)} loading={actionLoading} />
      )}
      {deletingProduct && (
        <DeleteModal name={deletingProduct.productName} onConfirm={handleDeleteConfirm} onClose={() => setDeletingProduct(null)} loading={actionLoading} />
      )}

      <div className="max-w-6xl mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-8 pb-8 border-b border-white/10">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <span className="text-2xl sm:text-3xl">📦</span>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
                Product Management
              </h1>
            </div>
            <p className="text-slate-400 text-sm">
              {total} product{total !== 1 ? "s" : ""} in catalog — manage master items and variants.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => navigate("/admin/dashboard")}
              className="px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
            >
              ← Dashboard
            </button>
            <button 
              onClick={() => navigate("/admin/products/new")}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-purple-500/20"
            >
              + Create Product
            </button>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full flex-1">
              <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2 ml-1">Search Catalog</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-purple-500/50 transition-all outline-none"
                placeholder="Product name, brand…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-[10px] uppercase tracking-widest font-black text-slate-500 mb-2 ml-1">Category</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500/50 transition-all outline-none"
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button type="submit" className="flex-1 sm:flex-none px-6 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-500 transition-all">
                Search
              </button>
              {(search || categoryFilter !== "all") && (
                <button 
                  type="button" 
                  onClick={() => { setSearchInput(""); setSearch(""); setCategoryFilter("all"); }}
                  className="px-4 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm hover:bg-white/10"
                >
                  ✕
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Products List/Table ── */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="text-center py-24 text-slate-500">
              <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
              Loading catalog…
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-medium">No products found.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Desktop Table Header */}
              <div className="hidden lg:grid grid-cols-[60px_1fr_140px_120px_100px_100px_150px] gap-4 px-6 py-4 bg-white/5 border-b border-white/10">
                {["", "Product", "Category", "Brand", "Variants", "Sales", "Actions"].map((h, i) => (
                  <span key={i} className="text-[10px] uppercase tracking-widest font-black text-slate-500">{h}</span>
                ))}
              </div>

              {/* Product Rows/Cards */}
              {products.map((p) => (
                <div key={p._id} className="animate-fadeIn">
                  <div
                    className="flex flex-col lg:grid lg:grid-cols-[60px_1fr_140px_120px_100px_100px_150px] gap-4 px-6 py-6 lg:py-4 border-b border-white/5 transition-all ap-row group"
                    onClick={() => toggleExpand(p._id)}
                  >
                    {/* Image & Main Info (Stacked on Mobile) */}
                    <div className="flex items-center gap-4 lg:contents">
                      <div className="flex-shrink-0">
                        {p.image ? (
                          <img src={p.image} alt={p.productName} className="w-12 h-12 lg:w-10 lg:h-10 object-cover rounded-xl shadow-lg shadow-black/20" />
                        ) : (
                          <div className="w-12 h-12 lg:w-10 lg:h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-xl">📦</div>
                        )}
                      </div>

                      <div className="flex-grow">
                        <div className="text-base lg:text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{p.productName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">ID: {p._id.slice(-8)}</div>
                      </div>
                    </div>

                    {/* Metadata (Columns on Desktop, Labels on Mobile) */}
                    <div className="flex items-center gap-2 lg:block">
                      <span className="lg:hidden text-[9px] uppercase font-black text-slate-600 mr-2">Category</span>
                      <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg">
                        {p.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 lg:block">
                      <span className="lg:hidden text-[9px] uppercase font-black text-slate-600 mr-2">Brand</span>
                      <span className="text-sm text-slate-300 font-medium">{p.brand || "—"}</span>
                    </div>

                    <div className="flex items-center gap-2 lg:block">
                      <span className="lg:hidden text-[9px] uppercase font-black text-slate-600 mr-2">Variants</span>
                      <span className="text-sm text-slate-400">{p.variantCount ?? 0}</span>
                    </div>

                    <div className="flex items-center gap-2 lg:block">
                      <span className="lg:hidden text-[9px] uppercase font-black text-slate-600 mr-2">Sales</span>
                      <span className="text-sm text-emerald-400 font-bold">{p.howManyProductsSold ?? 0}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 lg:mt-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/5" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => setEditingProduct(p)}
                        className="flex-1 lg:flex-none p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition-all text-sm"
                      >
                        ✏️ <span className="lg:hidden ml-1">Edit</span>
                      </button>
                      <button 
                        onClick={() => setDeletingProduct(p)}
                        className="flex-1 lg:flex-none p-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all text-sm"
                      >
                        🗑️ <span className="lg:hidden ml-1">Delete</span>
                      </button>
                      <button 
                        onClick={() => toggleExpand(p._id)}
                        className="p-2.5 bg-white/5 text-slate-400 border border-white/10 rounded-xl hover:bg-white/10 text-sm"
                      >
                        {expandedProduct === p._id ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Variant Panel */}
                  {expandedProduct === p._id && (
                    <div className="bg-purple-500/5 px-6 pb-6 pt-2 border-b border-white/5 animate-fadeIn">
                      <div className="lg:ml-[60px]">
                        <VariantPanel productId={p._id} onToast={showToast} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
            <button 
              className={`px-6 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs font-bold transition-all ${currentPage === 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10"}`}
              disabled={currentPage === 1} 
              onClick={() => loadProducts(currentPage - 1)}
            >
              ← Previous
            </button>
            <span className="text-slate-500 text-xs font-medium">
              Page <span className="text-white">{currentPage}</span> of {totalPages} • {total} items
            </span>
            <button 
              className={`px-6 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs font-bold transition-all ${currentPage === totalPages ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10"}`}
              disabled={currentPage === totalPages} 
              onClick={() => loadProducts(currentPage + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
      <AdminMobileNav />
    </div>
  );
}
