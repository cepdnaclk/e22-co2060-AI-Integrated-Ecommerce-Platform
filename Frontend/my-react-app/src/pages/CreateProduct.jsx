import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createProduct, createProductVariant } from "../services/productService";
import ProductNameAutocomplete from "../components/ProductNameAutocomplete";
import API_BASE_URL from "../config/api";

/* ─── Style tokens (dark blue glassmorphism, matching CreateSellerOffer) ─── */
const S = {
    pg: {
        minHeight: "100vh",
        background: "linear-gradient(135deg, #050B2E, #081A4A, #020617)",
        color: "#fff",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        display: "flex",
        justifyContent: "center",
        padding: "48px 24px",
    },
    card: {
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "clamp(16px, 5vw, 36px)",
        backdropFilter: "blur(10px)",
        width: "100%",
        maxWidth: 900,
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

export default function CreateProduct() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    // When a seller comes here from CreateSellerOffer, returnTo will be set
    // e.g. /seller/offers/new — after creation we redirect back there with ?preselect=<id>
    const returnTo = searchParams.get("returnTo");
    const isSellerFlow = Boolean(returnTo);

    // Primary product details
    const [product, setProduct] = useState({
        productName: "",
        category: "",
        brand: "",
        description: "",
        image: "", // Base product image URL
    });

    // Dynamic array of variants
    const [variants, setVariants] = useState([
        // Start with one empty variant block
        { id: 1, variantName: "", color: "", storage: "", size: "", image: "" }
    ]);

    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, success = true) => {
        setToast({ msg, success });
        setTimeout(() => setToast(null), 4000);
    };

    const handleProductChange = (e) => {
        const { name, value } = e.target;
        setProduct((prev) => ({ ...prev, [name]: value }));
    };

    // Called when the admin selects a suggestion — auto-fills all product fields
    const handleProductNameSelect = async (selectedName) => {
        setProduct((prev) => ({ ...prev, productName: selectedName }));
        setAiLoading(true);
        showToast("✦ AI is fetching product details…", true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/product-details`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_name: selectedName }),
            });
            if (!res.ok) throw new Error("AI fetch failed");
            const data = await res.json();

            setProduct((prev) => ({
                ...prev,
                productName: data.name || selectedName,
                brand: data.brand || "",
                category: data.category || "",
                description: data.description || "",
                image: (data.images && data.images[0]) || "",
            }));

            if (Array.isArray(data.variants) && data.variants.length > 0) {
                setVariants(
                    data.variants.map((v, i) => ({
                        id: Date.now() + i,
                        variantName: v.variantName || "",
                        color: v.color || "",
                        storage: v.storage || "",
                        size: v.size || "",
                        image: v.image || "",
                    }))
                );
            }

            showToast("✅ Product details auto-filled by AI!", true);
        } catch {
            showToast("AI auto-fill failed. Please fill in the fields manually.", false);
        } finally {
            setAiLoading(false);
        }
    };

    const handleVariantChange = (id, field, value) => {
        setVariants((prev) =>
            prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
        );
    };

    const addVariant = () => {
        setVariants((prev) => [
            ...prev,
            { id: Date.now(), variantName: "", color: "", storage: "", size: "", image: "" }
        ]);
    };

    const removeVariant = (id) => {
        setVariants((prev) => prev.filter((v) => v.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!product.productName || !product.category) {
            showToast("Product name and category are required", false);
            return;
        }

        setLoading(true);

        try {
            // 1. Create the base product
            const productRes = await createProduct({
                productName: product.productName,
                category: product.category,
                brand: product.brand,
                description: product.description,
                image: product.image,
            });

            const newProductId = productRes.product._id;

            // 2. Iterate and create variants, if any exist and are valid
            const validVariants = variants.filter(v => v.variantName.trim() !== "");

            if (validVariants.length > 0) {
                // Run all variant creations concurrently for speed
                const variantPromises = validVariants.map((v) =>
                    createProductVariant(newProductId, {
                        variantName: v.variantName,
                        color: v.color,
                        storage: v.storage,
                        size: v.size,
                        image: v.image,
                        attributes: {},
                    })
                );
                await Promise.all(variantPromises);
            }

            showToast(`Success! Created product with ${validVariants.length} variant(s).`);

            setTimeout(() => {
                if (isSellerFlow) {
                    // Return to offer creation with the new product pre-selected
                    navigate(`${returnTo}?preselect=${newProductId}`);
                } else {
                    navigate(`/products/${newProductId}`);
                }
            }, 1500);

        } catch (err) {
            showToast(err.message, false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={S.pg}>
            <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .cp-card { animation: fadeIn .5s ease forwards; }
        .cp-input:focus { border-color: #0582ca !important; }
        .cp-input:disabled { opacity: 0.5; cursor: not-allowed; }
        
        @media (max-width: 768px) {
            .cp-grid-auto { grid-template-columns: 1fr !important; }
            .cp-header { flex-direction: column; align-items: flex-start !important; gap: 16px !important; }
            .cp-btn-container { width: 100%; flex-direction: column-reverse !important; }
            .cp-btn-container > * { width: 100% !important; }
            .cp-variant-grid { grid-template-columns: 1fr !important; }
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

            <div style={{ width: "100%", maxWidth: 900 }}>
                {/* Header */}
                <div className="cp-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 700, margin: 0 }}>
                            {isSellerFlow ? "Add New Product to Catalog" : "Create Catalog Product"}
                        </h1>
                        <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 13 }}>
                            {isSellerFlow
                                ? "Add this product to the catalog so you can create an offer for it"
                                : "Add a new global product and define its specific configurations (variants)"}
                        </p>
                    </div>
                    <button type="button" onClick={() => navigate(returnTo || -1)} style={{ ...S.btnGray, fontSize: 13, padding: "10px 20px" }}>
                        {isSellerFlow ? "← Back to Offer" : "← Back"}
                    </button>
                </div>

                {/* AI Loading Overlay */}
                {aiLoading && (
                    <div style={{
                        position: "fixed", inset: 0, zIndex: 9998,
                        background: "rgba(5,11,46,0.75)", backdropFilter: "blur(6px)",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 16,
                    }}>
                        <div style={{
                            width: 48, height: 48,
                            border: "3px solid rgba(5,130,202,0.2)",
                            borderTopColor: "#0582ca", borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                        }} />
                        <p style={{ color: "#94a3b8", fontWeight: 600, fontSize: 15, animation: "pulse 1.5s ease-in-out infinite" }}>
                            ✦ AI is fetching product details…
                        </p>
                    </div>
                )}

                {/* Main Card */}
                <div className="cp-card" style={S.card}>
                    <form onSubmit={handleSubmit}>

                        {/* ── SECTION 1: Base Product ── */}
                        <h2 style={{ fontSize: 18, color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 10, marginBottom: 20 }}>
                            1. Base Product Information
                        </h2>
                        {/* AI auto-fill hint banner */}
                        <div style={{
                            background: "rgba(5,130,202,0.08)",
                            border: "1px solid rgba(5,130,202,0.2)",
                            borderRadius: 10, padding: "10px 16px",
                            marginBottom: 20, display: "flex", alignItems: "center", gap: 10,
                        }}>
                            <span style={{ fontSize: 16 }}>✦</span>
                            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
                                <strong style={{ color: "#38bdf8" }}>AI Auto-Fill</strong> — Start typing a product name to get AI-powered suggestions.
                                Selecting a suggestion will automatically populate all form fields.
                            </p>
                        </div>

                        <div className="cp-grid-auto" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
                            <ProductNameAutocomplete
                                value={product.productName}
                                onChange={(val) => setProduct((prev) => ({ ...prev, productName: val }))}
                                onSelect={handleProductNameSelect}
                                inputStyle={S.input}
                                labelStyle={S.label}
                                disabled={aiLoading}
                            />
                            <div>
                                <label style={S.label}>Category *</label>
                                <select required className="cp-input" style={S.input} name="category" value={product.category} onChange={handleProductChange}>
                                    <option value="" disabled>Select category...</option>
                                    <option value="Electronics">Electronics</option>
                                    <option value="Fashion">Fashion</option>
                                    <option value="Home">Home</option>
                                    <option value="Beauty">Beauty</option>
                                    <option value="Sports">Sports</option>
                                </select>
                            </div>
                        </div>

                        <div className="cp-grid-auto" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                            <div>
                                <label style={S.label}>Brand</label>
                                <input className="cp-input" style={S.input} name="brand" value={product.brand} onChange={handleProductChange} placeholder="e.g. Apple" />
                            </div>
                            <div>
                                <label style={S.label}>Base Image URL</label>
                                <input className="cp-input" style={S.input} name="image" value={product.image} onChange={handleProductChange} placeholder="https://..." />
                            </div>
                        </div>

                        <div style={{ marginBottom: 40 }}>
                            <label style={S.label}>Description</label>
                            <textarea className="cp-input" style={{ ...S.input, minHeight: 100, resize: "vertical" }} name="description" value={product.description} onChange={handleProductChange} placeholder="Product description..." />
                        </div>


                        {/* ── SECTION 2: Variants ── */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 10, marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, color: "#fff", margin: 0 }}>2. Product Variants (Optional)</h2>
                            <button type="button" onClick={addVariant} style={{ background: "rgba(74,198,255,0.15)", border: "1px solid rgba(74,198,255,0.3)", borderRadius: 8, color: "#4ac6ff", padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                + Add Variant
                            </button>
                        </div>

                        {variants.length === 0 && (
                            <div style={{ textAlign: "center", padding: "30px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)", marginBottom: 30 }}>
                                <p style={{ color: "#94a3b8", fontSize: 14 }}>No variants added. The product will be created as a standalone item.</p>
                            </div>
                        )}

                        {variants.map((variant, index) => (
                            <div key={variant.id} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "20px 24px", marginBottom: 20, position: "relative" }}>
                                <button
                                    type="button"
                                    onClick={() => removeVariant(variant.id)}
                                    style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 18, fontWeight: 700 }}
                                    title="Remove variant"
                                >✕</button>

                                <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: "#4ac6ff" }}>Variant {index + 1}</div>

                                <div className="cp-variant-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                                    <div>
                                        <label style={S.label}>Variant Name *</label>
                                        <input className="cp-input" style={S.input} value={variant.variantName} onChange={(e) => handleVariantChange(variant.id, "variantName", e.target.value)} required placeholder="e.g. Natural Titanium 512GB" />
                                    </div>
                                    <div>
                                        <label style={S.label}>Color</label>
                                        <input className="cp-input" style={S.input} value={variant.color} onChange={(e) => handleVariantChange(variant.id, "color", e.target.value)} placeholder="e.g. Gray" />
                                    </div>
                                    <div>
                                        <label style={S.label}>Storage</label>
                                        <input className="cp-input" style={S.input} value={variant.storage} onChange={(e) => handleVariantChange(variant.id, "storage", e.target.value)} placeholder="e.g. 512GB" />
                                    </div>
                                </div>

                                <div className="cp-variant-grid" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
                                    <div>
                                        <label style={S.label}>Size</label>
                                        <input className="cp-input" style={S.input} value={variant.size} onChange={(e) => handleVariantChange(variant.id, "size", e.target.value)} placeholder="e.g. XL" />
                                    </div>
                                    <div>
                                        <label style={S.label}>Variant Image URL</label>
                                        <input className="cp-input" style={S.input} value={variant.image} onChange={(e) => handleVariantChange(variant.id, "image", e.target.value)} placeholder="https://..." />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* ── Actions ── */}
                        <div className="cp-btn-container" style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginTop: 40, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24 }}>
                            <button type="button" onClick={() => navigate(returnTo || -1)} style={S.btnGray}>Cancel</button>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{ ...S.btnBlue, opacity: loading ? 0.65 : 1, minWidth: 200, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                            >
                                {loading ? (
                                    <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Creating...</>
                                ) : "Create Product & Variants →"}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
