// src/pages/ProductDetails.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchProductDetails } from "../services/productService";
import { addToCart } from "../services/cartService";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState(null);
  const [toast, setToast] = useState(null);
  // Map: offerId -> quantity
  const [quantities, setQuantities] = useState({});

  const token = localStorage.getItem("token");

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await fetchProductDetails(id);
      setData(response);
      // Initialise all quantities to 1
      if (response?.offers) {
        const init = {};
        response.offers.forEach((o) => { init[o._id] = 1; });
        setQuantities(init);
      }
    } catch (err) {
      console.error("❌ Product details error:", err);
      setError("Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, success = true) => {
    setToast({ msg, success });
    setTimeout(() => setToast(null), 3000);
  };

  const getQty = (offerId) => quantities[offerId] ?? 1;
  const setQty = (offerId, val, maxStock) => {
    const clamped = Math.max(1, Math.min(val, maxStock || 999));
    setQuantities((prev) => ({ ...prev, [offerId]: clamped }));
  };

  const handleAddToCart = async (offerId, qty) => {
    if (!token) {
      navigate("/login");
      return;
    }
    setAddingId(offerId);
    try {
      await addToCart(token, offerId, qty);
      showToast(`✓ ${qty > 1 ? qty + "× " : ""}Added to cart!`);
    } catch (err) {
      showToast(err.message || "Failed to add to cart", false);
    } finally {
      setAddingId(null);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#050B2E,#081A4A,#020617)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #4ac6ff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#050B2E,#081A4A,#020617)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171", fontSize: 16 }}>
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { product, offers } = data;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#050B2E,#081A4A,#020617)", color: "#fff", fontFamily: "'Segoe UI',Arial,sans-serif", padding: "32px 24px" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .pd-offer-row{transition:transform 0.18s,box-shadow 0.18s,border-color 0.18s;}
        .pd-offer-row:hover{transform:translateY(-2px)!important;box-shadow:0 10px 28px rgba(5,130,202,0.15)!important;border-color:rgba(5,130,202,0.25)!important;}
        .pd-add-btn:hover:not(:disabled){opacity:0.82!important;}
        .pd-cart-btn:hover{background:rgba(5,130,202,0.2)!important;}
        .pd-wrap{animation:fadeIn 0.4s ease forwards;}
        .qty-stepper-btn{
          width:30px;height:30px;border-radius:7px;
          border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.07);
          color:#fff;cursor:pointer;font-size:17px;font-weight:700;
          display:flex;align-items:center;justify-content:center;
          transition:background 0.18s,border-color 0.18s;line-height:1;
        }
        .qty-stepper-btn:hover:not(:disabled){background:rgba(5,130,202,0.28);border-color:#0582ca;}
        .qty-stepper-btn:disabled{opacity:0.35;cursor:not-allowed;}
        .qty-input{
          width:42px;text-align:center;
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.12);
          border-radius:7px;color:#fff;font-size:14px;font-weight:700;
          padding:4px 0;outline:none;
        }
        .qty-input:focus{border-color:#0582ca;}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: toast.success ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${toast.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderRadius: 12, padding: "13px 20px",
          color: toast.success ? "#4ade80" : "#f87171",
          fontWeight: 600, fontSize: 14, backdropFilter: "blur(12px)",
          animation: "toastIn 0.3s ease forwards", display: "flex", alignItems: "center", gap: 10,
        }}>
          {toast.msg}
          {toast.success && (
            <button
              onClick={() => navigate("/cart")}
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 7, color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "4px 10px" }}
            >
              View Cart →
            </button>
          )}
        </div>
      )}

      <div className="pd-wrap" style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Product Info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 48 }}>
          {/* Image */}
          <div>
            <img
              src={product.image}
              alt={product.productName}
              style={{ width: "100%", borderRadius: 18, objectFit: "cover", maxHeight: 400, background: "#1e293b" }}
              onError={(e) => { e.target.style.background = "#1e293b"; }}
            />
          </div>

          {/* Details */}
          <div style={{ paddingTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0582ca", background: "rgba(5,130,202,0.1)", border: "1px solid rgba(5,130,202,0.2)", borderRadius: 20, padding: "3px 12px" }}>
              {product.category}
            </span>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: "14px 0 10px", lineHeight: 1.3 }}>
              {product.productName}
            </h1>
            <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              {product.description || "No description available"}
            </p>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              🏪 {offers.length} seller{offers.length !== 1 ? "s" : ""} available
            </div>

            {/* Quick cart link */}
            <div style={{ marginTop: 24 }}>
              <button
                className="pd-cart-btn"
                onClick={() => navigate("/cart")}
                style={{
                  background: "rgba(5,130,202,0.08)", border: "1px solid rgba(5,130,202,0.2)",
                  borderRadius: 10, color: "#4ac6ff", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, padding: "9px 18px", transition: "background 0.2s",
                }}
              >
                🛒 View Cart
              </button>
            </div>
          </div>
        </div>

        {/* Seller Offers */}
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Available Sellers</h2>

          {offers.length === 0 ? (
            <div style={{
              padding: "40px 24px", textAlign: "center",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14,
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>😔</div>
              <p style={{ color: "#f87171", fontSize: 14 }}>Currently unavailable from all sellers</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {offers.map((offer) => {
                const isAdding = addingId === offer._id;
                const qty = getQty(offer._id);
                const discounted = offer.discountPercentage > 0
                  ? offer.price * (1 - offer.discountPercentage / 100)
                  : null;
                const effectivePrice = discounted ?? offer.price;
                const outOfStock = offer.stock === 0;

                return (
                  <div
                    key={offer._id}
                    className="pd-offer-row"
                    style={{
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14, padding: "18px 20px",
                    }}
                  >
                    {/* Top row: seller info + price */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      {/* Seller Info */}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                          {offer.sellerName || "Seller"}
                        </p>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#64748b" }}>🛡️ {offer.warranty || "No warranty"}</span>
                          {!outOfStock ? (
                            <span style={{ fontSize: 12, color: "#64748b" }}>📦 {offer.stock} in stock</span>
                          ) : (
                            <span style={{ fontSize: 12, color: "#f87171" }}>Out of stock</span>
                          )}
                          {offer.deliveryOptions?.length > 0 && (
                            <span style={{ fontSize: 12, color: "#64748b" }}>🚚 {offer.deliveryOptions[0]}</span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {discounted ? (
                          <>
                            <p style={{ fontSize: 19, fontWeight: 800, color: "#4ade80", margin: 0 }}>
                              Rs. {discounted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p style={{ fontSize: 12, color: "#64748b", textDecoration: "line-through", margin: 0 }}>
                              Rs. {offer.price.toLocaleString()}
                            </p>
                            <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>
                              -{offer.discountPercentage}%
                            </span>
                          </>
                        ) : (
                          <p style={{ fontSize: 19, fontWeight: 800, color: "#4ade80", margin: 0 }}>
                            Rs. {offer.price.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom row: quantity stepper + add to cart */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, gap: 16, flexWrap: "wrap" }}>
                      {/* Quantity Stepper */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, color: "#94a3b8", marginRight: 4, fontWeight: 600 }}>QTY:</span>
                        <button
                          className="qty-stepper-btn"
                          onClick={() => setQty(offer._id, qty - 1, offer.stock)}
                          disabled={outOfStock || qty <= 1}
                        >−</button>
                        <input
                          className="qty-input"
                          type="number"
                          min={1}
                          max={offer.stock || 999}
                          value={qty}
                          onChange={(e) => setQty(offer._id, parseInt(e.target.value) || 1, offer.stock)}
                          disabled={outOfStock}
                        />
                        <button
                          className="qty-stepper-btn"
                          onClick={() => setQty(offer._id, qty + 1, offer.stock)}
                          disabled={outOfStock || qty >= (offer.stock || 999)}
                        >+</button>
                        {!outOfStock && (
                          <span style={{ fontSize: 11, color: "#475569", marginLeft: 6 }}>
                            (max {offer.stock})
                          </span>
                        )}
                      </div>

                      {/* Line total + Add to Cart */}
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                        {!outOfStock && qty > 1 && (
                          <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
                            = Rs. {(effectivePrice * qty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                        <button
                          className="pd-add-btn"
                          onClick={() => handleAddToCart(offer._id, qty)}
                          disabled={isAdding || outOfStock}
                          style={{
                            background: outOfStock ? "rgba(255,255,255,0.05)" : "linear-gradient(to right,#006494,#0582ca)",
                            color: outOfStock ? "#64748b" : "#fff",
                            border: "none", borderRadius: 10,
                            cursor: outOfStock ? "not-allowed" : "pointer",
                            fontWeight: 700, fontSize: 13, padding: "10px 22px",
                            opacity: isAdding ? 0.7 : 1, transition: "opacity 0.2s",
                            display: "flex", alignItems: "center", gap: 6, minWidth: 130,
                            justifyContent: "center",
                          }}
                        >
                          {isAdding ? (
                            <>
                              <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                              Adding…
                            </>
                          ) : outOfStock ? "Out of Stock" : "🛒 Add to Cart"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
