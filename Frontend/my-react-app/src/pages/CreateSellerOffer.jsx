import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { createSellerOffer } from "../services/sellerOfferService";
import { fetchProducts } from "../services/productService";
import API_BASE_URL from "../config/api";

/* ─── Style tokens (dark blue glassmorphism, matching SellerDashboard) ─── */
const S = {
    pg: {
        minHeight: "100vh",
        background: "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
        color: "#fff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        display: "flex",
        justifyContent: "center",
    },
    card: {
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "clamp(16px, 5vw, 36px)",
        backdropFilter: "blur(10px)",
        width: "100%",
        maxWidth: 760,
    },
    label: {
        display: "block",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "#94a3b8",
        marginBottom: 8,
        fontWeight: 600,
    },
    input: {
        width: "100%",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        color: "#fff",
        padding: "12px 16px",
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.2s",
    },
    btnBlue: {
        background: "linear-gradient(to right, #006494, #0582ca)",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 15,
        padding: "12px 28px",
        transition: "opacity 0.2s",
    },
    btnGray: {
        background: "rgba(255,255,255,0.05)",
        color: "#94a3b8",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 15,
        padding: "12px 28px",
        textDecoration: "none",
        display: "inline-block",
    },
};

const DELIVERY_OPTIONS = ["Standard", "Express", "Same Day", "Pickup"];

export default function CreateSellerOffer() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedVariantIds, setSelectedVariantIds] = useState(new Set()); // ✅ multi-select
    const [variants, setVariants] = useState([]); // ✅ variants for the selected product
    const [showDropdown, setShowDropdown] = useState(false);
    const [form, setForm] = useState({
        price: "",
        stock: "",
        warranty: "",
        discountPercentage: "",
        deliveryOptions: ["Standard"],
    });

    // Image upload state
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchProducts({ limit: 200 }).then((data) => setProducts(data.products || []));
    }, []);

    /* Auto-select product when returning from CreateProduct with ?preselect=<id> */
    useEffect(() => {
        const preselectId = searchParams.get("preselect");
        if (!preselectId) return;
        fetch(`${API_BASE_URL}/api/products/${preselectId}`)
            .then(res => res.json())
            .then(data => {
                if (data.product) {
                    setSelectedProduct(data.product);
                    setShowDropdown(false);
                    showToast(`✅ "${data.product.productName}" selected! Fill in your offer details below.`);
                }
            })
            .catch(err => console.error("Failed to preselect product:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Load variants when product is selected */
    useEffect(() => {
        if (!selectedProduct) {
            setVariants([]);
            setSelectedVariantIds(new Set());
            return;
        }
        fetch(`${API_BASE_URL}/api/products/${selectedProduct._id}/variants`)
            .then(res => res.json())
            .then(data => setVariants(data || []))
            .catch(err => console.error("Failed to load variants", err));
    }, [selectedProduct]);

    /* Close dropdown on outside click */
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target))
                setShowDropdown(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filteredProducts = products.filter((p) =>
        p.productName.toLowerCase().includes(search.toLowerCase())
    );

    const handleDeliveryToggle = (opt) => {
        setForm((prev) => ({
            ...prev,
            deliveryOptions: prev.deliveryOptions.includes(opt)
                ? prev.deliveryOptions.filter((d) => d !== opt)
                : [...prev.deliveryOptions, opt],
        }));
    };

    const showToast = (msg, success = true) => {
        setToast({ msg, success });
        setTimeout(() => setToast(null), 4000);
    };

    /* ─── Image selection ─── */
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate type & size (max 5 MB)
        if (!file.type.startsWith("image/")) {
            showToast("Please select an image file (JPG, PNG, WEBP…)", false);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast("Image must be under 5 MB", false);
            return;
        }

        setImageFile(file);
        setImageUrl(""); // reset previously uploaded URL
        setImagePreview(URL.createObjectURL(file));
    };

    /* ─── Upload to Firebase Storage ─── */
    const uploadImage = () => {
        return new Promise((resolve, reject) => {
            if (!imageFile) { resolve(""); return; }

            setUploading(true);
            const storageRef = ref(
                storage,
                `seller-offers/${Date.now()}_${imageFile.name}`
            );
            const task = uploadBytesResumable(storageRef, imageFile);

            task.on(
                "state_changed",
                (snap) => {
                    const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                    setUploadProgress(pct);
                },
                (err) => {
                    setUploading(false);
                    reject(err);
                },
                async () => {
                    const url = await getDownloadURL(task.snapshot.ref);
                    setImageUrl(url);
                    setUploading(false);
                    resolve(url);
                }
            );
        });
    };

    /* ─── Remove image ─── */
    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setImageUrl("");
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    /* ─── Submit ─── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProduct) { showToast("Please select a product.", false); return; }

        const token = localStorage.getItem("token");
        if (!token) { showToast("Please log in as a seller.", false); return; }

        setLoading(true);
        try {
            // Upload image first (if any), then create offer
            let uploadedUrl = imageUrl;
            if (imageFile && !imageUrl) {
                uploadedUrl = await uploadImage();
            }

            await createSellerOffer(token, {
                productId: selectedProduct._id,
                variantIds: Array.from(selectedVariantIds),
                price: Number(form.price),
                stock: Number(form.stock),
                warranty: form.warranty || "No warranty",
                discountPercentage: Number(form.discountPercentage) || 0,
                deliveryOptions: form.deliveryOptions.length > 0 ? form.deliveryOptions : ["Standard"],
                image: uploadedUrl,
            });

            showToast("Offer created successfully! 🎉");
            setTimeout(() => navigate("/seller/offers"), 1500);
        } catch (err) {
            showToast(err.message, false);
        } finally {
            setLoading(false);
        }
    };

    const isSubmitting = loading || uploading;

    return (
        <div className="p-4 md:p-12" style={S.pg}>
            <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .cso-card { animation: fadeIn .5s ease forwards; }
        .cso-input:focus { border-color: #0582ca !important; }
        .cso-product-row:hover { background: rgba(5,130,202,0.12) !important; }
        .cso-del-btn { transition: all 0.2s; user-select: none; }
        .cso-del-btn.active { background: rgba(5,130,202,0.2) !important; border-color: #0582ca !important; color: #4ac6ff !important; }
        .cso-upload-zone { transition: border-color 0.2s, background 0.2s; }
        .cso-upload-zone:hover { border-color: #0582ca !important; background: rgba(5,130,202,0.06) !important; cursor: pointer; }
        
        @media (max-width: 640px) {
            .cso-variant-grid { grid-template-columns: 1fr !important; }
            .cso-header-row { flex-direction: column; align-items: flex-start !important; }
            .cso-btn-container { width: 100%; flex-direction: column-reverse !important; }
            .cso-btn-container > * { width: 100% !important; }
            .cso-pg { padding: 16px !important; }
        }
      `}</style>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: "fixed", top: 28, right: 28, zIndex: 9999,
                    background: toast.success ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${toast.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                    borderRadius: 12, padding: "14px 22px",
                    color: toast.success ? "#4ade80" : "#f87171",
                    fontWeight: 600, fontSize: 14, backdropFilter: "blur(12px)",
                    animation: "toastIn 0.3s ease forwards", maxWidth: 360,
                }}>
                    {toast.msg}
                </div>
            )}

            <div style={{ width: "100%", maxWidth: 760 }}>

                {/* Header */}
                <div className="cso-header-row flex justify-between items-center gap-4 mb-8">
                    <div>
                        <h1 style={{ fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 700, margin: 0 }}>Create New Offer</h1>
                        <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 13 }}>
                            List a product for sale from your seller account
                        </p>
                    </div>
                    <Link to="/seller/offers" style={{ ...S.btnGray, fontSize: 13, padding: "10px 20px" }}>← My Offers</Link>
                </div>

                {/* Main Card */}
                <div className="cso-card" style={S.card}>
                    <form onSubmit={handleSubmit}>

                        {/* ── Product Selector ── */}
                        <div style={{ marginBottom: 24 }} ref={dropdownRef}>
                            <label style={S.label}>Product *</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    className="cso-input"
                                    style={{
                                        ...S.input,
                                        borderColor: selectedProduct ? "#0582ca" : "rgba(255,255,255,0.1)",
                                    }}
                                    placeholder="Search products by name…"
                                    value={selectedProduct ? selectedProduct.productName : search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setSelectedProduct(null);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    autoComplete="off"
                                />
                                {selectedProduct && (
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedProduct(null); setSearch(""); setSelectedVariantIds(new Set()); }}
                                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18 }}
                                    >✕</button>
                                )}

                                {showDropdown && !selectedProduct && (
                                    <div style={{
                                        position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100,
                                        background: "#0f1f3a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                                        maxHeight: 260, overflowY: "auto", backdropFilter: "blur(12px)",
                                    }}>
                                        {filteredProducts.length === 0
                                            ? (
                                                <div style={{ padding: "16px", textAlign: "center" }}>
                                                    <p style={{ color: "#64748b", margin: "0 0 12px 0", fontSize: 13 }}>No products match your search.</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate("/seller/products/new?returnTo=/seller/offers/new")}
                                                        style={{ background: "rgba(5,130,202,0.15)", border: "1px solid #0582ca", color: "#4ac6ff", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                                                    >
                                                        + Create New Product
                                                    </button>
                                                </div>
                                            )
                                            : filteredProducts.slice(0, 50).map((p) => (
                                                <div
                                                    key={p._id}
                                                    className="cso-product-row"
                                                    onClick={() => { setSelectedProduct(p); setShowDropdown(false); setSearch(""); }}
                                                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                                                >
                                                    <img src={p.image} alt={p.productName} style={{ width: 38, height: 38, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "#1e293b" }} onError={(e) => { e.target.style.display = "none"; }} />
                                                    <div>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{p.productName}</div>
                                                        <div style={{ fontSize: 11, color: "#64748b" }}>{p.category}{p.brand ? ` · ${p.brand}` : ""}</div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>

                            {/* Hint link — always visible when no product selected */}
                            {!selectedProduct && (
                                <div style={{ marginTop: 8, textAlign: "right" }}>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/seller/products/new?returnTo=/seller/offers/new")}
                                        style={{
                                            background: "none", border: "none", cursor: "pointer",
                                            color: "#4ac6ff", fontSize: 12, fontWeight: 600,
                                            textDecoration: "underline", padding: 0,
                                        }}
                                    >
                                        + Product not in list? Create it
                                    </button>
                                </div>
                            )}

                            {/* Selected product preview */}
                            {selectedProduct && (
                                <div style={{
                                    marginTop: 12, display: "flex", alignItems: "center", gap: 12,
                                    background: "rgba(5,130,202,0.08)", border: "1px solid rgba(5,130,202,0.2)",
                                    borderRadius: 10, padding: "10px 14px",
                                }}>
                                    <img src={selectedProduct.image} alt={selectedProduct.productName}
                                        style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, background: "#1e293b" }}
                                        onError={(e) => { e.target.style.display = "none"; }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>{selectedProduct.productName}</div>
                                        <div style={{ fontSize: 12, color: "#64748b" }}>{selectedProduct.category}{selectedProduct.brand ? ` · ${selectedProduct.brand}` : ""}</div>
                                    </div>
                                    <div style={{ marginLeft: "auto", fontSize: 11, color: "#4ac6ff", fontWeight: 600, background: "rgba(74,198,255,0.08)", padding: "3px 10px", borderRadius: 20 }}>Selected ✓</div>
                                </div>
                            )}
                        </div>

                        {/* ── Variant Selector (multi-select – appears only if product has variants) ── */}
                        {selectedProduct && variants.length > 0 && (
                            <div style={{ marginBottom: 24, animation: "fadeIn 0.3s ease" }}>
                                <label style={S.label}>
                                    Product Variants{" "}
                                    <span style={{ color: "#475569", textTransform: "none", fontWeight: 400 }}>
                                        (optional – select all you offer)
                                    </span>
                                </label>
                                <div className="cso-variant-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                                    {variants.map((v) => {
                                        const isSelected = selectedVariantIds.has(v._id);
                                        return (
                                            <button
                                                key={v._id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedVariantIds((prev) => {
                                                        const next = new Set(prev);
                                                        if (next.has(v._id)) next.delete(v._id);
                                                        else next.add(v._id);
                                                        return next;
                                                    });
                                                }}
                                                style={{
                                                    background: isSelected ? "rgba(5,130,202,0.15)" : "rgba(255,255,255,0.03)",
                                                    border: `1px solid ${isSelected ? "#0582ca" : "rgba(255,255,255,0.1)"}`,
                                                    borderRadius: 10, padding: "10px 14px", textAlign: "left",
                                                    cursor: "pointer", display: "flex", gap: 10, alignItems: "center",
                                                    transition: "all 0.2s",
                                                }}
                                            >
                                                {v.image && (
                                                    <img src={v.image} alt={v.variantName} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} />
                                                )}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: isSelected ? "#4ac6ff" : "#e2e8f0" }}>
                                                        {v.variantName}
                                                    </div>
                                                    {(v.color || v.storage) && (
                                                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                                                            {[v.color, v.storage].filter(Boolean).join(" · ")}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{
                                                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                                                    border: `2px solid ${isSelected ? "#0582ca" : "rgba(255,255,255,0.2)"}`,
                                                    background: isSelected ? "#0582ca" : "transparent",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: 11, color: "#fff", transition: "all 0.15s",
                                                }}>
                                                    {isSelected && "✓"}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedVariantIds.size > 0 && (
                                    <div style={{ marginTop: 8, fontSize: 12, color: "#4ac6ff" }}>
                                        {selectedVariantIds.size} variant{selectedVariantIds.size > 1 ? "s" : ""} selected
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Image Upload ── */}
                        <div style={{ marginBottom: 24 }}>
                            <label style={S.label}>Offer Image <span style={{ color: "#475569", textTransform: "none", fontWeight: 400 }}>(optional – max 5 MB)</span></label>

                            {!imagePreview ? (
                                /* Drop zone */
                                <div
                                    className="cso-upload-zone"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: "2px dashed rgba(255,255,255,0.12)",
                                        borderRadius: 12, padding: "32px 24px",
                                        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                                        background: "rgba(255,255,255,0.02)",
                                        userSelect: "none",
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const dt = e.dataTransfer;
                                        if (dt.files.length) handleImageChange({ target: { files: dt.files } });
                                    }}
                                >
                                    <div style={{ fontSize: 36 }}>🖼️</div>
                                    <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 14 }}>Click or drag & drop an image</div>
                                    <div style={{ fontSize: 12, color: "#64748b" }}>JPG, PNG, WEBP · Max 5 MB</div>
                                </div>
                            ) : (
                                /* Preview + progress */
                                <div style={{
                                    position: "relative",
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(5,130,202,0.25)",
                                    borderRadius: 12, overflow: "hidden",
                                }}>
                                    <img
                                        src={imagePreview}
                                        alt="offer preview"
                                        style={{ width: "100%", maxHeight: 240, objectFit: "contain", display: "block", background: "#0d1b38" }}
                                    />

                                    {/* Upload progress bar */}
                                    {uploading && (
                                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.08)" }}>
                                            <div style={{ height: "100%", width: `${uploadProgress}%`, background: "linear-gradient(to right, #006494, #4ac6ff)", transition: "width 0.3s" }} />
                                        </div>
                                    )}

                                    {/* Overlay controls */}
                                    <div style={{
                                        position: "absolute", top: 10, right: 10, display: "flex", gap: 8,
                                    }}>
                                        {imageUrl && (
                                            <span style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#4ade80" }}>
                                                ✓ Uploaded
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#f87171", cursor: "pointer", fontWeight: 700, fontSize: 13, padding: "4px 12px" }}
                                        >
                                            ✕ Remove
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#94a3b8", cursor: "pointer", fontWeight: 700, fontSize: 13, padding: "4px 12px" }}
                                        >
                                            Change
                                        </button>
                                    </div>

                                    {uploading && (
                                        <div style={{ position: "absolute", inset: 0, background: "rgba(2,6,23,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                                            <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #4ac6ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                                            <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>Uploading {uploadProgress}%</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={handleImageChange}
                            />

                            {imageFile && !imageUrl && !uploading && (
                                <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                                    📁 {imageFile.name} · {(imageFile.size / 1024).toFixed(0)} KB — will be uploaded on submit
                                </p>
                            )}
                        </div>

                        {/* ── Price & Stock ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                            <div>
                                <label style={S.label}>Price (Rs.) *</label>
                                <input className="cso-input" type="number" min="0" step="0.01" required style={S.input} placeholder="e.g. 12900" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                            </div>
                            <div>
                                <label style={S.label}>Stock Quantity *</label>
                                <input className="cso-input" type="number" min="0" required style={S.input} placeholder="e.g. 50" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                            </div>
                        </div>

                        {/* ── Warranty & Discount ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                            <div>
                                <label style={S.label}>Warranty</label>
                                <input className="cso-input" style={S.input} placeholder="e.g. 1 Year Official" value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} />
                            </div>
                            <div>
                                <label style={S.label}>Discount %</label>
                                <input className="cso-input" type="number" min="0" max="99" style={S.input} placeholder="e.g. 10" value={form.discountPercentage} onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })} />
                            </div>
                        </div>

                        {/* ── Delivery Options ── */}
                        <div style={{ marginBottom: 32 }}>
                            <label style={S.label}>Delivery Options</label>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                {DELIVERY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        className={`cso-del-btn ${form.deliveryOptions.includes(opt) ? "active" : ""}`}
                                        onClick={() => handleDeliveryToggle(opt)}
                                        style={{
                                            padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                            background: "rgba(255,255,255,0.04)",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            color: "#94a3b8",
                                        }}
                                    >{opt}</button>
                                ))}
                            </div>
                        </div>

                        {/* ── Actions ── */}
                        <div className="cso-btn-container flex justify-end gap-3 mt-4">
                            <Link to="/seller/dashboard" style={S.btnGray} className="text-center">Cancel</Link>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                style={{ ...S.btnBlue, opacity: isSubmitting ? 0.65 : 1, minWidth: 170, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                            >
                                {uploading ? (
                                    <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Uploading image…</>
                                ) : loading ? (
                                    <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Creating…</>
                                ) : "Create Offer →"}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
