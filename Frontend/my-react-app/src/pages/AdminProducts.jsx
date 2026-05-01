import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
    <div style={S.pg}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
        .ap-row:hover { background: rgba(168,85,247,0.04) !important; }
        .ap-input:focus { border-color: rgba(168,85,247,0.5) !important; }
        select option { background: #1e1b4b; color: #fff; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: toast.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderRadius: 12, padding: "12px 20px",
          color: toast.type === "success" ? "#4ade80" : "#f87171",
          fontWeight: 600, fontSize: 14, backdropFilter: "blur(12px)",
          animation: "toastIn 0.3s ease forwards", maxWidth: 340,
        }}>{toast.msg}</div>
      )}

      {/* Modals */}
      {editingProduct && (
        <EditProductModal product={editingProduct} onSave={handleEditSave} onClose={() => setEditingProduct(null)} loading={actionLoading} />
      )}
      {deletingProduct && (
        <DeleteModal name={deletingProduct.productName} onConfirm={handleDeleteConfirm} onClose={() => setDeletingProduct(null)} loading={actionLoading} />
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 26 }}>📦</span>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, background: "linear-gradient(to right,#fff,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Product Management
              </h1>
            </div>
            <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
              {total} product{total !== 1 ? "s" : ""} in catalog — create, edit, delete and manage variants
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={S.btnGray} onClick={() => navigate("/admin/dashboard")}>← Dashboard</button>
            <button style={S.btnPurple} onClick={() => navigate("/admin/products/new")}>+ Create Product</button>
          </div>
        </div>

        {/* ── Filters ── */}
        <div style={{ ...S.card, marginBottom: 20 }}>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={S.label}>Search</label>
              <input
                className="ap-input"
                style={{ ...S.input, width: "100%" }}
                placeholder="Product name, brand…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div style={{ minWidth: 160 }}>
              <label style={S.label}>Category</label>
              <select
                className="ap-input"
                style={{ ...S.input, width: "100%" }}
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button type="submit" style={S.btnPurple}>Search</button>
            {(search || categoryFilter !== "all") && (
              <button type="button" style={S.btnGray} onClick={() => { setSearchInput(""); setSearch(""); setCategoryFilter("all"); }}>Clear</button>
            )}
          </form>
        </div>

        {/* ── Products Table ── */}
        <div style={S.card}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
              <div style={{ width: 40, height: 40, border: "3px solid rgba(168,85,247,0.2)", borderTopColor: "#a855f7", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              Loading products…
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <p>No products found.</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px 120px 80px 80px 130px", gap: 12, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 4 }}>
                {["", "Product", "Category", "Brand", "Variants", "Sales", "Actions"].map((h, i) => (
                  <span key={i} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", fontWeight: 700 }}>{h}</span>
                ))}
              </div>

              {/* Product Rows */}
              {products.map((p) => (
                <div key={p._id} style={{ animation: "fadeIn 0.3s ease forwards" }}>
                  <div
                    className="ap-row"
                    style={{ display: "grid", gridTemplateColumns: "48px 1fr 120px 120px 80px 80px 130px", gap: 12, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center", cursor: "pointer", borderRadius: 8, transition: "background 0.15s" }}
                    onClick={() => toggleExpand(p._id)}
                  >
                    {/* Image */}
                    <div>
                      {p.image ? (
                        <img src={p.image} alt={p.productName} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} onError={(e) => { e.target.style.display = "none"; }} />
                      ) : (
                        <div style={{ width: 40, height: 40, background: "rgba(168,85,247,0.1)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📦</div>
                      )}
                    </div>

                    {/* Name */}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>{p.productName}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>ID: {p._id.slice(-8)}</div>
                    </div>

                    {/* Category */}
                    <div>
                      <span style={{ fontSize: 12, background: "rgba(168,85,247,0.1)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 6, padding: "3px 8px" }}>
                        {p.category}
                      </span>
                    </div>

                    {/* Brand */}
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>{p.brand || "—"}</div>

                    {/* Variants */}
                    <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center" }}>{p.variantCount ?? "—"}</div>

                    {/* Sales */}
                    <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center" }}>{p.howManyProductsSold ?? 0}</div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <button style={S.btnBlue} onClick={() => setEditingProduct(p)} title="Edit product">✏️</button>
                      <button style={S.btnRed} onClick={() => setDeletingProduct(p)} title="Delete product">🗑️</button>
                      <button style={{ ...S.btnGray, fontSize: 11, padding: "6px 8px" }} onClick={() => toggleExpand(p._id)} title="Manage variants">
                        {expandedProduct === p._id ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Variant Panel */}
                  {expandedProduct === p._id && (
                    <div style={{ padding: "0 16px 16px 76px", background: "rgba(168,85,247,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <VariantPanel productId={p._id} onToast={showToast} />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 24 }}>
            <button style={{ ...S.btnGray, opacity: currentPage === 1 ? 0.4 : 1 }} disabled={currentPage === 1} onClick={() => loadProducts(currentPage - 1)}>← Prev</button>
            <span style={{ color: "#94a3b8", fontSize: 14 }}>Page {currentPage} of {totalPages} · {total} total</span>
            <button style={{ ...S.btnGray, opacity: currentPage === totalPages ? 0.4 : 1 }} disabled={currentPage === totalPages} onClick={() => loadProducts(currentPage + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
