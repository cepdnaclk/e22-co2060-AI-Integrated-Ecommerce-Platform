import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const PIE_COLORS = ["#a855f7", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

export default function AdminInventory() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");

  // ─── Dashboard State ───
  const [dashboard, setDashboard] = useState(null);

  // ─── Inventory List State ───
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("all");
  const [stockStatus, setStockStatus] = useState("");
  const [sort, setSort] = useState("latest");
  const [sellerFilter, setSellerFilter] = useState("");

  // ─── Filter Options ───
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);

  // ─── Detail Modal ───
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetail, setItemDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ─── Stock Update Modal ───
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockForm, setStockForm] = useState({ quantityChange: 0, type: "restock", reason: "" });

  // ─── Bulk Update ───
  const [bulkSelections, setBulkSelections] = useState({});
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkQty, setBulkQty] = useState(0);
  const [bulkType, setBulkType] = useState("restock");
  const [bulkReason, setBulkReason] = useState("");

  // ─── Edit Product Modal ───
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // ─── Loading ───
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const apiFetch = useCallback(async (url, options = {}) => {
    // Use adminToken if available, fallback to regular token
    const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
    if (!token) { navigate("/admin/login"); return null; }
    const res = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Request failed");
    }
    return res.json();
  }, [navigate]);

  // ─── Load Dashboard ───
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/admin/inventory/dashboard");
      if (data) setDashboard(data);
    } catch (e) { setError(e.message); showToast(e.message, "error"); }
    setLoading(false);
  }, [apiFetch, showToast]);

  // ─── Load Inventory List ───
  const loadInventory = useCallback(async (pg = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pg, limit: 15, search, category, stockStatus, sort, seller: sellerFilter,
      });
      const data = await apiFetch(`/api/admin/inventory?${params}`);
      if (data) {
        setItems(data.items || []);
        setTotalItems(data.totalItems || 0);
        setCurrentPage(data.currentPage || 1);
        setTotalPages(data.totalPages || 1);
      }
    } catch (e) { setError(e.message); showToast(e.message, "error"); }
    setLoading(false);
  }, [apiFetch, showToast, search, category, stockStatus, sort, sellerFilter]);

  // ─── Load filter options ───
  const loadFilterOptions = useCallback(async () => {
    try {
      const data = await apiFetch("/api/admin/inventory/filter-options");
      if (data) {
        setCategories(data.categories || []);
        setSellers(data.sellers || []);
      }
    } catch { /* silent */ }
  }, [apiFetch]);

  // ─── Load item detail ───
  const loadItemDetail = async (id) => {
    try {
      const data = await apiFetch(`/api/admin/inventory/${id}`);
      if (data) setItemDetail(data);
    } catch (e) { showToast(e.message, "error"); }
  };

  // ─── Effects ───
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadFilterOptions(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === "dashboard") loadDashboard(); }, [tab]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === "list") loadInventory(1); }, [tab, search, category, stockStatus, sort, sellerFilter]);

  // ─── Handlers ───
  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const handlePageChange = (pg) => {
    setCurrentPage(pg);
    loadInventory(pg);
  };

  const openDetail = async (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
    await loadItemDetail(item._id);
  };

  const openStockUpdate = (item) => {
    setSelectedItem(item);
    setStockForm({ quantityChange: 0, type: "restock", reason: "" });
    setShowStockModal(true);
  };

  const handleStockUpdate = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/inventory/${selectedItem._id}/stock`, {
        method: "PUT",
        body: JSON.stringify(stockForm),
      });
      showToast("Stock updated successfully");
      setShowStockModal(false);
      loadInventory(currentPage);
    } catch (e) { showToast(e.message, "error"); }
    setActionLoading(false);
  };

  const handleToggleStatus = async (item) => {
    try {
      await apiFetch(`/api/admin/inventory/${item._id}/toggle`, { method: "PUT" });
      showToast(`Offer ${item.isActive ? "deactivated" : "activated"}`);
      loadInventory(currentPage);
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleBulkUpdate = async () => {
    const selectedIds = Object.keys(bulkSelections).filter(k => bulkSelections[k]);
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      const updates = selectedIds.map(offerId => ({
        offerId, quantityChange: Number(bulkQty), type: bulkType, reason: bulkReason,
      }));
      const data = await apiFetch("/api/admin/inventory/bulk-update", {
        method: "PUT",
        body: JSON.stringify({ updates }),
      });
      showToast(data.message);
      setShowBulkModal(false);
      setBulkSelections({});
      loadInventory(currentPage);
    } catch (e) { showToast(e.message, "error"); }
    setActionLoading(false);
  };

  const handleExport = async () => {
    try {
      const data = await apiFetch("/api/admin/inventory/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inventory-export.json";
      a.click();
      URL.revokeObjectURL(url);
      showToast("Inventory exported!");
    } catch (e) { showToast(e.message, "error"); }
  };

  const openEditProduct = (item) => {
    // item might be from the list (which has productId as object or string)
    // In the list tab, 'item' has 'productName', 'productImage', etc. directly.
    // The actual productId is usually item.productId
    const pId = item.productId?._id || item.productId;
    setEditingProduct({
      _id: pId,
      productName: item.productName || item.productId?.productName,
      image: item.productImage || item.productId?.image,
      category: item.category || item.productId?.category,
      brand: item.brand || item.productId?.brand,
      description: item.description || item.productId?.description || "",
    });
    setShowEditProductModal(true);
  };

  const handleEditProductSave = async (formData) => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/admin/products/${editingProduct._id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      showToast("Product updated successfully");
      setShowEditProductModal(false);
      // Refresh data
      if (tab === "list") loadInventory(currentPage);
      if (showDetailModal) await loadItemDetail(selectedItem._id);
    } catch (e) { showToast(e.message, "error"); }
    setActionLoading(false);
  };

  const toggleBulkSelect = (id) => {
    setBulkSelections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const allSelected = items.every(i => bulkSelections[i._id]);
    if (allSelected) setBulkSelections({});
    else {
      const obj = {};
      items.forEach(i => { obj[i._id] = true; });
      setBulkSelections(obj);
    }
  };

  const selectedCount = Object.values(bulkSelections).filter(Boolean).length;

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  return (
    <div style={S.pageWrapper}>
    <div style={S.page}>
      {/* Toast */}
      {toast && (
        <div style={{ ...S.toast, background: toast.type === "error" ? "#ef4444" : "#22c55e" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>📦</span>
            <h1 style={S.title}>Inventory Management</h1>
          </div>
          <p style={S.subtitle}>Monitor stock levels, manage inventory, and track movements</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleExport} style={S.btnOutline}>⬇ Export</button>
          <button onClick={() => navigate("/admin/dashboard")} style={S.btnGray}>← Admin</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {[
          { key: "dashboard", label: "📊 Dashboard" },
          { key: "list", label: "📋 Inventory" },
          { key: "alerts", label: "🔔 Stock Alerts" },
          { key: "history", label: "📜 History" },
          { key: "categories", label: "📂 Categories" },
          { key: "sellers", label: "🏪 Sellers" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={tab === t.key ? { ...S.tab, ...S.tabActive } : S.tab}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ marginTop: 24 }}>
        {tab === "dashboard" && <DashboardTab dashboard={dashboard} loading={loading} error={error} />}
        {tab === "list" && (
          <InventoryListTab
            items={items} loading={loading} totalItems={totalItems}
            currentPage={currentPage} totalPages={totalPages}
            searchInput={searchInput} setSearchInput={setSearchInput}
            handleSearch={handleSearch} category={category} setCategory={setCategory}
            stockStatus={stockStatus} setStockStatus={setStockStatus}
            sort={sort} setSort={setSort} sellerFilter={sellerFilter}
            setSellerFilter={setSellerFilter} categories={categories} sellers={sellers}
            handlePageChange={handlePageChange} openDetail={openDetail}
            openStockUpdate={openStockUpdate} openEditProduct={openEditProduct} 
            handleToggleStatus={handleToggleStatus}
            bulkSelections={bulkSelections} toggleBulkSelect={toggleBulkSelect}
            selectAll={selectAll} selectedCount={selectedCount}
            setShowBulkModal={setShowBulkModal}
          />
        )}
        {tab === "alerts" && <AlertsTab apiFetch={apiFetch} showToast={showToast} openStockUpdate={openStockUpdate} />}
        {tab === "history" && <HistoryTab apiFetch={apiFetch} />}
        {tab === "categories" && <CategoriesTab apiFetch={apiFetch} />}
        {tab === "sellers" && <SellersTab apiFetch={apiFetch} showToast={showToast} />}
      </div>

      {/* ─── Detail Modal ─── */}
      {showDetailModal && (
        <Modal onClose={() => { setShowDetailModal(false); setItemDetail(null); }}>
          <h2 style={S.modalTitle}>📦 Inventory Item Detail</h2>
          {itemDetail ? (
            <div>
              <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
                <img
                  src={itemDetail.offer.productId?.image || "/placeholder.png"}
                  alt=""
                  style={{ width: 100, height: 100, borderRadius: 12, objectFit: "cover", background: "#1e293b" }}
                />
                <div>
                  <h3 style={{ color: "#fff", margin: 0, fontSize: 18 }}>{itemDetail.offer.productId?.productName}</h3>
                  <p style={{ color: "#94a3b8", margin: "4px 0" }}>Seller: {itemDetail.offer.sellerName || itemDetail.offer.sellerId?.shopName}</p>
                  <p style={{ color: "#94a3b8", margin: "4px 0" }}>Category: {itemDetail.offer.productId?.category}</p>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <span style={S.badge}>💰 ${itemDetail.offer.price}</span>
                    <span style={{ ...S.badge, background: itemDetail.offer.stock === 0 ? "rgba(239,68,68,0.2)" : itemDetail.offer.stock <= 10 ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)" }}>
                      📦 {itemDetail.offer.stock} units
                    </span>
                    <span style={{ ...S.badge, background: itemDetail.offer.isActive ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)" }}>
                      {itemDetail.offer.isActive ? "✅ Active" : "⏸ Inactive"}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                        setShowDetailModal(false);
                        openEditProduct(itemDetail.offer);
                    }} 
                    style={{ ...S.btnOutlineSm, marginTop: 12, color: "#c084fc", borderColor: "rgba(168,85,247,0.4)" }}
                  >
                    ✏️ Edit Catalog Product
                  </button>
                </div>
              </div>
              {itemDetail.offer.variantIds?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ color: "#cbd5e1", marginBottom: 8 }}>Variants</h4>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {itemDetail.offer.variantIds.map(v => (
                      <span key={v._id} style={S.variantChip}>
                        {v.variantName || [v.color, v.storage, v.size].filter(Boolean).join(" · ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {itemDetail.logs?.length > 0 && (
                <div>
                  <h4 style={{ color: "#cbd5e1", marginBottom: 8 }}>Recent Stock Changes</h4>
                  <div style={{ maxHeight: 200, overflowY: "auto" }}>
                    {itemDetail.logs.map(log => (
                      <div key={log._id} style={S.logRow}>
                        <span style={{ ...S.logType, background: log.quantityChange > 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: log.quantityChange > 0 ? "#22c55e" : "#ef4444" }}>
                          {log.type}
                        </span>
                        <span style={{ color: log.quantityChange > 0 ? "#22c55e" : "#ef4444", fontWeight: 600, minWidth: 60 }}>
                          {log.quantityChange > 0 ? "+" : ""}{log.quantityChange}
                        </span>
                        <span style={{ color: "#94a3b8", fontSize: 13 }}>
                          {log.previousStock} → {log.newStock}
                        </span>
                        <span style={{ color: "#64748b", fontSize: 12, marginLeft: "auto" }}>
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <p style={{ color: "#94a3b8" }}>Loading...</p>}
        </Modal>
      )}

      {/* ─── Stock Update Modal ─── */}
      {showStockModal && selectedItem && (
        <Modal onClose={() => setShowStockModal(false)}>
          <h2 style={S.modalTitle}>📦 Update Stock</h2>
          <p style={{ color: "#94a3b8", marginBottom: 20 }}>
            {selectedItem.productName} — by {selectedItem.sellerName}
            <br />Current stock: <strong style={{ color: "#fff" }}>{selectedItem.stock}</strong>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={S.label}>
              Type
              <select value={stockForm.type} onChange={e => setStockForm(p => ({ ...p, type: e.target.value }))} style={S.input}>
                <option value="restock">Restock (Add)</option>
                <option value="adjustment">Adjustment</option>
                <option value="return">Return</option>
                <option value="damaged">Damaged (Remove)</option>
              </select>
            </label>
            <label style={S.label}>
              Quantity Change
              <input
                type="number"
                value={stockForm.quantityChange}
                onChange={e => setStockForm(p => ({ ...p, quantityChange: Number(e.target.value) }))}
                style={S.input}
                placeholder="e.g. +50 or -10"
              />
              <span style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                New stock will be: {selectedItem.stock + stockForm.quantityChange}
              </span>
            </label>
            <label style={S.label}>
              Reason (optional)
              <input
                type="text"
                value={stockForm.reason}
                onChange={e => setStockForm(p => ({ ...p, reason: e.target.value }))}
                style={S.input}
                placeholder="e.g. New shipment arrived"
              />
            </label>
            <button onClick={handleStockUpdate} disabled={actionLoading} style={S.btnPurple}>
              {actionLoading ? "Updating..." : "Update Stock"}
            </button>
          </div>
        </Modal>
      )}

      {/* ─── Bulk Update Modal ─── */}
      {showBulkModal && (
        <Modal onClose={() => setShowBulkModal(false)}>
          <h2 style={S.modalTitle}>📦 Bulk Stock Update</h2>
          <p style={{ color: "#94a3b8", marginBottom: 16 }}>
            Updating <strong style={{ color: "#a855f7" }}>{selectedCount}</strong> items
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={S.label}>
              Type
              <select value={bulkType} onChange={e => setBulkType(e.target.value)} style={S.input}>
                <option value="restock">Restock (Add)</option>
                <option value="adjustment">Adjustment</option>
                <option value="damaged">Damaged (Remove)</option>
              </select>
            </label>
            <label style={S.label}>
              Quantity Change (applied to all)
              <input type="number" value={bulkQty} onChange={e => setBulkQty(Number(e.target.value))} style={S.input} />
            </label>
            <label style={S.label}>
              Reason
              <input type="text" value={bulkReason} onChange={e => setBulkReason(e.target.value)} style={S.input} />
            </label>
            <button onClick={handleBulkUpdate} disabled={actionLoading} style={S.btnPurple}>
              {actionLoading ? "Processing..." : `Update ${selectedCount} Items`}
            </button>
          </div>
        </Modal>
      )}

      {/* ─── Edit Product Modal ─── */}
      {showEditProductModal && editingProduct && (
        <EditProductModal 
          product={editingProduct} 
          onSave={handleEditProductSave} 
          onClose={() => setShowEditProductModal(false)} 
          loading={actionLoading} 
        />
      )}
    </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════

function Modal({ onClose, children, maxWidth = 600 }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={S.closeBtn}>✕</button>
        {children}
      </div>
    </div>
  );
}

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
    <Modal onClose={onClose} maxWidth={540}>
      <h2 style={S.modalTitle}>✏️ Edit Catalog Product</h2>
      <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 24 }}>
        Updating this will affect all sellers offering this product.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <label style={S.label}>Product Name *</label>
          <input style={{ ...S.input, width: "100%" }} name="productName" value={form.productName} onChange={handleChange} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={S.label}>Category *</label>
            <select style={{ ...S.input, width: "100%", height: 38 }} name="category" value={form.category} onChange={handleChange}>
              <option value="">Select...</option>
              <option value="Electronics">Electronics</option>
              <option value="Fashion">Fashion</option>
              <option value="Home">Home</option>
              <option value="Beauty">Beauty</option>
              <option value="Sports">Sports</option>
              <option value="Books">Books</option>
              <option value="Others">Others</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Brand</label>
            <input style={{ ...S.input, width: "100%" }} name="brand" value={form.brand} onChange={handleChange} placeholder="e.g. Apple" />
          </div>
        </div>
        <div>
          <label style={S.label}>Image URL</label>
          <div style={{ display: "flex", gap: 10 }}>
            <input style={{ ...S.input, flex: 1 }} name="image" value={form.image} onChange={handleChange} placeholder="https://..." />
            {form.image && (
              <img src={form.image} alt="" style={{ width: 38, height: 38, borderRadius: 6, objectFit: "cover", background: "#1e293b" }} onError={(e) => { e.target.style.display = "none"; }} />
            )}
          </div>
        </div>
        <div>
          <label style={S.label}>Description</label>
          <textarea style={{ ...S.input, width: "100%", minHeight: 90, resize: "vertical" }} name="description" value={form.description} onChange={handleChange} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 32 }}>
        <button style={S.btnGray} onClick={onClose} disabled={loading}>Cancel</button>
        <button style={{ ...S.btnPurple, opacity: loading ? 0.6 : 1 }} onClick={() => onSave(form)} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}

// ─── DASHBOARD TAB ───
function DashboardTab({ dashboard, loading, error }) {
  if (loading) {
    return <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading dashboard...</div>;
  }
  if (error) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <p style={{ color: "#ef4444", fontSize: 16, marginBottom: 8 }}>Failed to load dashboard</p>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>{error}</p>
      </div>
    );
  }
  if (!dashboard) {
    return <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>No data available</div>;
  }

  const { overview, categoryStock, monthlyMovement, ordersByStatus } = dashboard;

  const statCards = [
    { label: "Total Products", value: overview.totalProducts, icon: "🛍️", color: "#a855f7" },
    { label: "Active Offers", value: overview.activeOffers, icon: "🏷️", color: "#3b82f6" },
    { label: "Total Stock", value: overview.totalStock?.toLocaleString(), icon: "📦", color: "#22c55e" },
    { label: "Inventory Value", value: `$${overview.totalInventoryValue?.toLocaleString()}`, icon: "💰", color: "#f59e0b" },
    { label: "Low Stock", value: overview.lowStockCount, icon: "⚠️", color: "#f97316" },
    { label: "Out of Stock", value: overview.outOfStockCount, icon: "🚫", color: "#ef4444" },
    { label: "Units Sold", value: overview.totalUnitsSold?.toLocaleString(), icon: "📈", color: "#06b6d4" },
    { label: "Total Revenue", value: `$${overview.totalRevenue?.toLocaleString()}`, icon: "💵", color: "#10b981" },
  ];

  const pieData = categoryStock.map(c => ({ name: c._id || "Uncategorized", value: c.totalStock }));

  const statusData = Object.entries(ordersByStatus || {}).map(([k, v]) => ({ name: k, count: v }));

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        {statCards.map((s, i) => (
          <div key={i} style={S.statCard}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24, marginBottom: 32 }}>
        {/* Monthly Stock Movement */}
        <div style={S.chartCard}>
          <h3 style={S.chartTitle}>Monthly Stock Movement</h3>
          {monthlyMovement.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyMovement}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Bar dataKey="restocked" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sold" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: "#64748b", textAlign: "center", padding: 40 }}>No movement data yet</p>}
        </div>

        {/* Category Distribution Pie */}
        <div style={S.chartCard}>
          <h3 style={S.chartTitle}>Stock by Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: "#64748b", textAlign: "center", padding: 40 }}>No category data</p>}
        </div>
      </div>

      {/* Orders by Status */}
      {statusData.length > 0 && (
        <div style={S.chartCard}>
          <h3 style={S.chartTitle}>Orders by Status</h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "16px 0" }}>
            {statusData.map((s, i) => (
              <div key={i} style={{ ...S.statCard, minWidth: 140 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: PIE_COLORS[i % PIE_COLORS.length] }}>{s.count}</div>
                <div style={{ color: "#94a3b8", fontSize: 13, textTransform: "capitalize" }}>{s.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── INVENTORY LIST TAB ───
function InventoryListTab({
  items, loading, totalItems, currentPage, totalPages,
  searchInput, setSearchInput, handleSearch,
  category, setCategory, stockStatus, setStockStatus,
  sort, setSort, sellerFilter, setSellerFilter,
  categories, sellers, handlePageChange,
  openDetail, openStockUpdate, openEditProduct, handleToggleStatus,
  bulkSelections, toggleBulkSelect, selectAll, selectedCount, setShowBulkModal,
}) {
  return (
    <div>
      {/* Filters Bar */}
      <div style={S.filterBar}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, flex: 1 }}>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search products, sellers..."
            style={{ ...S.input, flex: 1 }}
          />
          <button type="submit" style={S.btnPurple}>🔍</button>
        </form>
        <select value={category} onChange={e => setCategory(e.target.value)} style={S.select}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={stockStatus} onChange={e => setStockStatus(e.target.value)} style={S.select}>
          <option value="">All Stock</option>
          <option value="healthy">Healthy (&gt;10)</option>
          <option value="low">Low (1-10)</option>
          <option value="out">Out of Stock</option>
        </select>
        <select value={sellerFilter} onChange={e => setSellerFilter(e.target.value)} style={S.select}>
          <option value="">All Sellers</option>
          {sellers.map(s => <option key={s._id} value={s._id}>{s.shopName}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={S.select}>
          <option value="latest">Latest</option>
          <option value="oldest">Oldest</option>
          <option value="stock_asc">Stock ↑</option>
          <option value="stock_desc">Stock ↓</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div style={S.bulkBar}>
          <span style={{ color: "#a855f7", fontWeight: 600 }}>{selectedCount} selected</span>
          <button onClick={() => setShowBulkModal(true)} style={S.btnPurpleSm}>Bulk Update Stock</button>
        </div>
      )}

      {/* Summary */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ color: "#94a3b8", fontSize: 14 }}>
          Showing {items.length} of {totalItems} items
        </span>
        <button onClick={selectAll} style={S.btnOutlineSm}>
          {items.every(i => bulkSelections[i._id]) ? "Deselect All" : "Select All"}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>No inventory items found</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>☑</th>
                <th style={S.th}>Product</th>
                <th style={S.th}>Category</th>
                <th style={S.th}>Seller</th>
                <th style={S.th}>Price</th>
                <th style={S.th}>Stock</th>
                <th style={S.th}>Items Sold</th>
                <th style={S.th}>Revenue</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id} style={S.tr}>
                  <td style={S.td}>
                    <input
                      type="checkbox"
                      checked={!!bulkSelections[item._id]}
                      onChange={() => toggleBulkSelect(item._id)}
                      style={{ accentColor: "#a855f7" }}
                    />
                  </td>
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img src={item.productImage || "/placeholder.png"} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", background: "#1e293b" }} />
                      <div>
                        <div style={{ color: "#fff", fontWeight: 500, fontSize: 14 }}>{item.productName}</div>
                        {item.brand && <div style={{ color: "#64748b", fontSize: 12 }}>{item.brand}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={S.td}>
                    <span style={S.catBadge}>{item.category}</span>
                  </td>
                  <td style={S.td}>
                    <div style={{ color: "#cbd5e1", fontSize: 14 }}>{item.sellerName}</div>
                    {item.sellerShop && <div style={{ color: "#64748b", fontSize: 12 }}>{item.sellerShop}</div>}
                  </td>
                  <td style={S.td}>
                    <span style={{ color: "#22c55e", fontWeight: 600 }}>${item.price}</span>
                    {item.discountPercentage > 0 && (
                      <span style={{ color: "#f59e0b", fontSize: 11, marginLeft: 4 }}>-{item.discountPercentage}%</span>
                    )}
                  </td>
                  <td style={S.td}>
                    <StockBadge stock={item.stock} />
                  </td>
                  <td style={S.td}>
                    <span style={{ color: "#06b6d4", fontWeight: 600 }}>{(item.itemsSold || 0).toLocaleString()}</span>
                    <div style={{ color: "#64748b", fontSize: 11 }}>units</div>
                  </td>
                  <td style={S.td}>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>${(item.revenue || 0).toLocaleString()}</span>
                  </td>
                  <td style={S.td}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                      background: item.isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: item.isActive ? "#22c55e" : "#ef4444",
                    }}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openDetail(item)} style={S.actionBtn} title="View Details">👁</button>
                      <button onClick={() => openEditProduct(item)} style={S.actionBtn} title="Edit Catalog Product">✏️</button>
                      <button onClick={() => openStockUpdate(item)} style={S.actionBtn} title="Update Stock">📦</button>
                      <button onClick={() => handleToggleStatus(item)} style={S.actionBtn} title={item.isActive ? "Deactivate" : "Activate"}>
                        {item.isActive ? "⏸" : "▶"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            style={{ ...S.pageBtn, opacity: currentPage <= 1 ? 0.4 : 1 }}
          >
            ←
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pg;
            if (totalPages <= 7) pg = i + 1;
            else if (currentPage <= 4) pg = i + 1;
            else if (currentPage >= totalPages - 3) pg = totalPages - 6 + i;
            else pg = currentPage - 3 + i;
            return (
              <button
                key={pg}
                onClick={() => handlePageChange(pg)}
                style={pg === currentPage ? { ...S.pageBtn, ...S.pageBtnActive } : S.pageBtn}
              >
                {pg}
              </button>
            );
          })}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            style={{ ...S.pageBtn, opacity: currentPage >= totalPages ? 0.4 : 1 }}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ALERTS TAB ───
function AlertsTab({ apiFetch, showToast, openStockUpdate }) {
  const [alerts, setAlerts] = useState([]);
  const [threshold, setThreshold] = useState(10);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/admin/inventory/alerts?threshold=${threshold}&page=${pg}&limit=20`);
      if (data) {
        setAlerts(data.alerts || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.totalItems || 0);
        setPage(data.currentPage || 1);
      }
    } catch (e) { showToast(e.message, "error"); }
    setLoading(false);
  }, [apiFetch, threshold, showToast]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(1); }, [threshold]);

  const urgencyColors = { critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h3 style={{ color: "#fff", margin: 0 }}>🔔 Stock Alerts</h3>
        <label style={{ color: "#94a3b8", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          Threshold:
          <input
            type="number"
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            style={{ ...S.input, width: 70 }}
            min={1}
          />
        </label>
        <span style={{ color: "#64748b", fontSize: 14 }}>({totalItems} items)</span>
      </div>
      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading...</div> : alerts.length === 0 ? (
        <div style={{ ...S.chartCard, textAlign: "center", padding: 40 }}>
          <span style={{ fontSize: 48 }}>✅</span>
          <p style={{ color: "#22c55e", fontSize: 18, marginTop: 12 }}>All stock levels are healthy!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {alerts.map(a => (
            <div key={a._id} style={{ ...S.alertCard, borderLeft: `4px solid ${urgencyColors[a.urgency] || "#3b82f6"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <img src={a.productImage || "/placeholder.png"} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", background: "#1e293b" }} />
                <div>
                  <div style={{ color: "#fff", fontWeight: 500 }}>{a.productName}</div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{a.sellerName} • {a.category}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: urgencyColors[a.urgency], fontWeight: 700, fontSize: 20 }}>{a.stock}</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>units left</div>
                </div>
                <span style={{
                  padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: `${urgencyColors[a.urgency]}20`, color: urgencyColors[a.urgency],
                  textTransform: "uppercase",
                }}>
                  {a.urgency}
                </span>
                <button onClick={() => openStockUpdate(a)} style={S.btnPurpleSm}>Restock</button>
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i + 1} onClick={() => load(i + 1)} style={i + 1 === page ? { ...S.pageBtn, ...S.pageBtnActive } : S.pageBtn}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── HISTORY TAB ───
function HistoryTab({ apiFetch }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 30, type: typeFilter });
      const data = await apiFetch(`/api/admin/inventory/history?${params}`);
      if (data) {
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setPage(data.currentPage || 1);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [apiFetch, typeFilter]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(1); }, [typeFilter]);

  const typeColors = {
    restock: "#22c55e", sale: "#3b82f6", adjustment: "#f59e0b",
    return: "#06b6d4", damaged: "#ef4444", initial: "#a855f7",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h3 style={{ color: "#fff", margin: 0 }}>📜 Inventory Movement History</h3>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={S.select}>
          <option value="">All Types</option>
          <option value="restock">Restock</option>
          <option value="sale">Sale</option>
          <option value="adjustment">Adjustment</option>
          <option value="return">Return</option>
          <option value="damaged">Damaged</option>
        </select>
      </div>
      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading...</div> : logs.length === 0 ? (
        <div style={{ ...S.chartCard, textAlign: "center", padding: 40 }}>
          <p style={{ color: "#64748b" }}>No inventory movement recorded yet</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Product</th>
                  <th style={S.th}>Seller</th>
                  <th style={S.th}>Type</th>
                  <th style={S.th}>Change</th>
                  <th style={S.th}>Stock</th>
                  <th style={S.th}>Reason</th>
                  <th style={S.th}>By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id} style={S.tr}>
                    <td style={S.td}>
                      <div style={{ color: "#cbd5e1", fontSize: 13 }}>
                        {new Date(log.createdAt).toLocaleDateString()}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 11 }}>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td style={S.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {log.productId?.image && (
                          <img src={log.productId.image} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} />
                        )}
                        <span style={{ color: "#fff", fontSize: 14 }}>{log.productId?.productName || "—"}</span>
                      </div>
                    </td>
                    <td style={{ ...S.td, color: "#94a3b8", fontSize: 13 }}>{log.sellerId?.shopName || log.sellerOfferId?.sellerName || "—"}</td>
                    <td style={S.td}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                        background: `${typeColors[log.type] || "#64748b"}20`,
                        color: typeColors[log.type] || "#64748b",
                        textTransform: "capitalize",
                      }}>
                        {log.type}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={{ color: log.quantityChange > 0 ? "#22c55e" : "#ef4444", fontWeight: 600, fontSize: 15 }}>
                        {log.quantityChange > 0 ? "+" : ""}{log.quantityChange}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={{ color: "#64748b", fontSize: 13 }}>{log.previousStock}</span>
                      <span style={{ color: "#94a3b8", margin: "0 4px" }}>→</span>
                      <span style={{ color: "#fff", fontWeight: 500 }}>{log.newStock}</span>
                    </td>
                    <td style={{ ...S.td, color: "#94a3b8", fontSize: 13, maxWidth: 180 }}>{log.reason || "—"}</td>
                    <td style={{ ...S.td, color: "#94a3b8", fontSize: 13 }}>
                      {log.performedBy ? `${log.performedBy.firstName || ""} ${log.performedBy.lastName || ""}`.trim() || log.performedBy.email : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                <button key={i + 1} onClick={() => load(i + 1)} style={i + 1 === page ? { ...S.pageBtn, ...S.pageBtnActive } : S.pageBtn}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── CATEGORIES TAB ───
function CategoriesTab({ apiFetch }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch("/api/admin/inventory/categories");
        if (res) setData(res);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [apiFetch]);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading...</div>;

  return (
    <div>
      <h3 style={{ color: "#fff", marginBottom: 20 }}>📂 Category-wise Stock Summary</h3>
      {data.length === 0 ? (
        <div style={{ ...S.chartCard, textAlign: "center", padding: 40 }}>
          <p style={{ color: "#64748b" }}>No category data available</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.map(d => ({ name: d._id || "Unknown", stock: d.totalStock, offers: d.offerCount }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Bar dataKey="stock" fill="#a855f7" radius={[4, 4, 0, 0]} name="Total Stock" />
                <Bar dataKey="offers" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Offers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {data.map((cat, i) => (
              <div key={i} style={S.chartCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <h4 style={{ color: "#fff", margin: 0 }}>{cat._id || "Uncategorized"}</h4>
                  <span style={S.catBadge}>{cat.offerCount} offers</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ color: "#a855f7", fontWeight: 700, fontSize: 20 }}>{cat.totalStock.toLocaleString()}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Total Stock</div>
                  </div>
                  <div>
                    <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 20 }}>${Math.round(cat.totalValue).toLocaleString()}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Total Value</div>
                  </div>
                  <div>
                    <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 20 }}>{cat.lowStockCount}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Low Stock</div>
                  </div>
                  <div>
                    <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 20 }}>{cat.outOfStockCount}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Out of Stock</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── SELLERS TAB ───
function SellersTab({ apiFetch, showToast }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, status: statusFilter });
      const res = await apiFetch(`/api/admin/inventory/sellers?${params}`);
      if (res) setData(res);
    } catch (e) { showToast(e.message, "error"); }
    setLoading(false);
  }, [apiFetch, search, statusFilter, showToast]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [search, statusFilter]);

  const handleToggle = async (seller) => {
    setActionLoading(p => ({ ...p, [seller._id]: true }));
    try {
      const res = await apiFetch(`/api/admin/inventory/sellers/${seller._id}/toggle`, { method: "PUT" });
      showToast(res.message);
      setData(prev => prev.map(s => s._id === seller._id ? { ...s, isActive: res.isActive } : s));
    } catch (e) { showToast(e.message, "error"); }
    setActionLoading(p => ({ ...p, [seller._id]: false }));
  };

  const handleVerify = async (seller, verificationStatus) => {
    setActionLoading(p => ({ ...p, [`v_${seller._id}`]: true }));
    try {
      const res = await apiFetch(`/api/admin/inventory/sellers/${seller._id}/verify`, {
        method: "PUT",
        body: JSON.stringify({ verificationStatus }),
      });
      showToast(res.message);
      setData(prev => prev.map(s => s._id === seller._id ? { ...s, verificationStatus } : s));
    } catch (e) { showToast(e.message, "error"); }
    setActionLoading(p => ({ ...p, [`v_${seller._id}`]: false }));
  };

  const verifyColors = { approved: "#22c55e", pending: "#f59e0b", rejected: "#ef4444" };

  return (
    <div>
      {/* Header + Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <h3 style={{ color: "#fff", margin: 0 }}>🏪 Seller Management</h3>
        <span style={{ color: "#64748b", fontSize: 14 }}>({data.length} sellers)</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search shop name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...S.input, width: 200 }}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={S.select}>
            <option value="">All Sellers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive / Suspended</option>
            <option value="approved">Verified</option>
            <option value="pending">Pending Approval</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading...</div>
        : data.length === 0 ? (
          <div style={{ ...S.chartCard, textAlign: "center", padding: 40 }}>
            <p style={{ color: "#64748b" }}>No sellers found</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.map(seller => {
              const healthPct = seller.offerCount > 0
                ? Math.round(((seller.offerCount - seller.lowStockCount - seller.outOfStockCount) / seller.offerCount) * 100)
                : 0;
              const isExpanded = expandedId === seller._id;
              return (
                <div key={seller._id} style={{
                  ...S.chartCard, padding: 0, overflow: "hidden",
                  border: seller.isActive ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(239,68,68,0.2)",
                }}>
                  {/* Row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", flexWrap: "wrap" }}>
                    {/* Avatar / Icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: seller.isActive ? "rgba(168,85,247,0.2)" : "rgba(100,116,139,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, flexShrink: 0,
                    }}>
                      🏪
                    </div>

                    {/* Seller info */}
                    <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{seller.shopName}</span>
                        <span style={{
                          padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                          background: `${verifyColors[seller.verificationStatus] || "#64748b"}20`,
                          color: verifyColors[seller.verificationStatus] || "#64748b",
                        }}>{seller.verificationStatus}</span>
                        <span style={{
                          padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                          background: seller.isActive ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                          color: seller.isActive ? "#22c55e" : "#ef4444",
                        }}>{seller.isActive ? "Active" : "Suspended"}</span>
                      </div>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                        {seller.ownerName && <span>{seller.ownerName} · </span>}
                        {seller.email}
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", flex: "2 1 400px" }}>
                      <Stat label="Offers" value={seller.offerCount} color="#94a3b8" />
                      <Stat label="Stock" value={seller.totalStock.toLocaleString()} color="#a855f7" />
                      <Stat label="Value" value={`$${Math.round(seller.totalValue).toLocaleString()}`} color="#22c55e" />
                      <Stat label="Orders" value={seller.totalOrders} color="#3b82f6" />
                      <Stat label="Revenue" value={`$${Math.round(seller.totalRevenue).toLocaleString()}`} color="#10b981" />
                      <Stat label="Rating" value={seller.rating > 0 ? `⭐ ${seller.rating.toFixed(1)}` : "—"} color="#f59e0b" />
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : seller._id)}
                        style={S.actionBtn}
                        title={isExpanded ? "Collapse" : "View Details"}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </button>
                      <button
                        onClick={() => handleToggle(seller)}
                        disabled={!!actionLoading[seller._id]}
                        style={{
                          ...S.btnPurpleSm,
                          background: seller.isActive ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                          color: seller.isActive ? "#ef4444" : "#22c55e",
                          border: `1px solid ${seller.isActive ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                        }}
                        title={seller.isActive ? "Suspend Seller" : "Enable Seller"}
                      >
                        {actionLoading[seller._id] ? "..." : seller.isActive ? "🚫 Suspend" : "✅ Enable"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px", background: "rgba(0,0,0,0.2)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
                        {/* Contact Info */}
                        <div>
                          <h4 style={{ color: "#c084fc", margin: "0 0 12px", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Contact & Details</h4>
                          <InfoRow label="Email" value={seller.email} />
                          <InfoRow label="Owner" value={seller.ownerName || "—"} />
                          <InfoRow label="Phone" value={seller.phone || seller.userPhone || "—"} />
                          <InfoRow label="Address" value={seller.address || "—"} />
                          <InfoRow label="Joined" value={new Date(seller.createdAt).toLocaleDateString()} />
                          {seller.description && <InfoRow label="Description" value={seller.description} />}
                        </div>

                        {/* Inventory Stats */}
                        <div>
                          <h4 style={{ color: "#c084fc", margin: "0 0 12px", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Inventory</h4>
                          <InfoRow label="Total Offers" value={seller.offerCount} />
                          <InfoRow label="Active Offers" value={seller.activeOffers} />
                          <InfoRow label="Total Stock" value={seller.totalStock.toLocaleString()} />
                          <InfoRow label="Inventory Value" value={`$${Math.round(seller.totalValue).toLocaleString()}`} />
                          <InfoRow label="Low Stock Items" value={<span style={{ color: seller.lowStockCount > 0 ? "#f59e0b" : "#64748b" }}>{seller.lowStockCount}</span>} />
                          <InfoRow label="Out of Stock" value={<span style={{ color: seller.outOfStockCount > 0 ? "#ef4444" : "#64748b" }}>{seller.outOfStockCount}</span>} />
                          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#64748b", fontSize: 13, width: 110 }}>Health:</span>
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)" }}>
                              <div style={{ width: `${healthPct}%`, height: "100%", borderRadius: 3, background: healthPct >= 70 ? "#22c55e" : healthPct >= 40 ? "#f59e0b" : "#ef4444" }} />
                            </div>
                            <span style={{ color: "#94a3b8", fontSize: 12 }}>{healthPct}%</span>
                          </div>
                        </div>

                        {/* Sales Stats */}
                        <div>
                          <h4 style={{ color: "#c084fc", margin: "0 0 12px", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Sales</h4>
                          <InfoRow label="Total Orders" value={seller.totalOrders} />
                          <InfoRow label="Items Sold" value={seller.itemsSold.toLocaleString()} />
                          <InfoRow label="Total Revenue" value={`$${Math.round(seller.totalRevenue).toLocaleString()}`} />
                          <InfoRow label="Rating" value={seller.rating > 0 ? `${seller.rating.toFixed(1)} / 5 (${seller.totalReviews} reviews)` : "No reviews yet"} />
                        </div>
                      </div>

                      {/* Verification Actions */}
                      <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ color: "#94a3b8", fontSize: 13 }}>Verification:</span>
                        {["approved", "pending", "rejected"].map(v => (
                          <button
                            key={v}
                            onClick={() => handleVerify(seller, v)}
                            disabled={seller.verificationStatus === v || !!actionLoading[`v_${seller._id}`]}
                            style={{
                              padding: "6px 16px", borderRadius: 8, border: "none", cursor: seller.verificationStatus === v ? "default" : "pointer",
                              fontSize: 13, fontWeight: 500,
                              background: seller.verificationStatus === v ? `${verifyColors[v]}30` : "rgba(255,255,255,0.06)",
                              color: seller.verificationStatus === v ? verifyColors[v] : "#94a3b8",
                              opacity: seller.verificationStatus === v ? 1 : 0.8,
                            }}
                          >
                            {v === "approved" ? "✅ Approve" : v === "rejected" ? "❌ Reject" : "⏳ Set Pending"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center", minWidth: 60 }}>
      <div style={{ color, fontWeight: 700, fontSize: 15 }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: 11 }}>{label}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
      <span style={{ color: "#64748b", fontSize: 13, minWidth: 110 }}>{label}:</span>
      <span style={{ color: "#cbd5e1", fontSize: 13 }}>{value}</span>
    </div>
  );
}

// ─── STOCK BADGE ───
function StockBadge({ stock }) {
  let bg, color, label;
  if (stock === 0) { bg = "rgba(239,68,68,0.15)"; color = "#ef4444"; label = "Out of stock"; }
  else if (stock <= 5) { bg = "rgba(239,68,68,0.1)"; color = "#f87171"; label = `${stock} left`; }
  else if (stock <= 10) { bg = "rgba(245,158,11,0.15)"; color = "#f59e0b"; label = `${stock} units`; }
  else { bg = "rgba(34,197,94,0.1)"; color = "#22c55e"; label = `${stock} units`; }
  return <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: bg, color }}>{label}</span>;
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════
const S = {
  pageWrapper: {
    minHeight: "100vh",
    width: "100%",
    background: "linear-gradient(135deg, #020617, #0f172a, #1e1b4b)",
    overflowX: "hidden",
  },
  page: {
    width: "100%",
    maxWidth: 1440,
    margin: "0 auto",
    color: "#fff",
    fontFamily: "'Segoe UI', Arial, sans-serif",
    padding: "40px 40px 60px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 24,
  },
  title: {
    fontSize: 28, fontWeight: 700, margin: 0,
    background: "linear-gradient(to right, #fff, #c084fc)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  subtitle: { color: "#94a3b8", fontSize: 14, margin: "8px 0 0 0" },
  tabs: {
    display: "flex", gap: 4, background: "rgba(255,255,255,0.03)",
    padding: 4, borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)",
    overflowX: "auto",
  },
  tab: {
    padding: "10px 18px", borderRadius: 8, border: "none", background: "transparent",
    color: "#94a3b8", cursor: "pointer", fontSize: 14, fontWeight: 500,
    whiteSpace: "nowrap", transition: "all 0.2s",
  },
  tabActive: {
    background: "rgba(168,85,247,0.15)", color: "#c084fc",
  },
  toast: {
    position: "fixed", top: 20, right: 20, padding: "12px 24px", borderRadius: 10,
    color: "#fff", fontWeight: 500, fontSize: 14, zIndex: 9999,
    animation: "fadeIn 0.3s ease",
  },
  filterBar: {
    display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16,
    padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.06)",
  },
  bulkBar: {
    display: "flex", alignItems: "center", gap: 16, marginBottom: 12,
    padding: "10px 16px", background: "rgba(168,85,247,0.1)", borderRadius: 10,
    border: "1px solid rgba(168,85,247,0.2)",
  },
  input: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "#fff", padding: "8px 12px", fontSize: 14, outline: "none",
  },
  select: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "#fff", padding: "8px 12px", fontSize: 13, outline: "none",
    cursor: "pointer",
  },
  label: {
    display: "flex", flexDirection: "column", gap: 6, color: "#94a3b8", fontSize: 14,
  },
  table: {
    width: "100%", borderCollapse: "separate", borderSpacing: "0 4px",
  },
  th: {
    textAlign: "left", padding: "10px 14px", color: "#64748b",
    fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  tr: {
    background: "rgba(255,255,255,0.02)", transition: "background 0.15s",
  },
  td: {
    padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.03)",
    fontSize: 14,
  },
  badge: {
    padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
    background: "rgba(168,85,247,0.15)", color: "#c084fc",
  },
  catBadge: {
    padding: "3px 10px", borderRadius: 6, fontSize: 12,
    background: "rgba(59,130,246,0.12)", color: "#60a5fa",
  },
  variantChip: {
    padding: "4px 10px", borderRadius: 6, fontSize: 12,
    background: "rgba(255,255,255,0.06)", color: "#94a3b8",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)", cursor: "pointer", fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.15s",
  },
  statCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12, padding: "20px 18px", textAlign: "center",
  },
  chartCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14, padding: 24,
  },
  chartTitle: {
    color: "#e2e8f0", fontSize: 16, fontWeight: 600, marginBottom: 16, margin: "0 0 16px",
  },
  alertCard: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12, padding: "16px 20px", gap: 16,
  },
  logRow: {
    display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  logType: {
    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500,
    textTransform: "capitalize",
  },
  pageBtn: {
    padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13,
  },
  pageBtnActive: {
    background: "rgba(168,85,247,0.2)", color: "#c084fc",
    border: "1px solid rgba(168,85,247,0.3)",
  },
  btnPurple: {
    background: "linear-gradient(to right, #7e22ce, #a855f7)", color: "#fff",
    border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600,
    fontSize: 14, padding: "10px 20px",
  },
  btnPurpleSm: {
    background: "linear-gradient(to right, #7e22ce, #a855f7)", color: "#fff",
    border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500,
    fontSize: 13, padding: "6px 14px",
  },
  btnGray: {
    background: "rgba(255,255,255,0.05)", color: "#e2e8f0",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
    cursor: "pointer", fontWeight: 600, fontSize: 14, padding: "10px 20px",
  },
  btnOutline: {
    background: "transparent", color: "#a855f7",
    border: "1px solid rgba(168,85,247,0.3)", borderRadius: 8,
    cursor: "pointer", fontWeight: 600, fontSize: 14, padding: "10px 20px",
  },
  btnOutlineSm: {
    background: "transparent", color: "#94a3b8",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
    cursor: "pointer", fontSize: 12, padding: "4px 12px",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16, padding: 32, width: "90%", maxWidth: 600,
    maxHeight: "80vh", overflowY: "auto", position: "relative",
  },
  modalTitle: {
    color: "#fff", fontSize: 20, fontWeight: 600, margin: "0 0 20px",
  },
  closeBtn: {
    position: "absolute", top: 16, right: 16, width: 32, height: 32,
    borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)", color: "#94a3b8",
    cursor: "pointer", fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
};
