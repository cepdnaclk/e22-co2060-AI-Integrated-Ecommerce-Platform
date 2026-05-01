import { useNavigate } from "react-router-dom";
import { useRecommendations } from "../hooks/useRecommendations";

const badgeStyle = (type) => {
  if (type === "co_purchase" || type === "both") {
    return {
      color: "#4ade80",
      background: "rgba(74,222,128,0.12)",
      border: "1px solid rgba(74,222,128,0.35)",
    };
  }
  return {
    color: "#4ac6ff",
    background: "rgba(74,198,255,0.12)",
    border: "1px solid rgba(74,198,255,0.35)",
  };
};

function SkeletonRow() {
  return (
    <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            minWidth: 210,
            height: 220,
            borderRadius: 14,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        />
      ))}
    </div>    
  );
}

export default function ProductRecommendations({ productId }) {
  const navigate = useNavigate();
  const { recommendations, loading } = useRecommendations(productId, 8);

  if (!productId) return null;
  if (loading) return <SkeletonRow />;
  if (!recommendations.length) return null;

  return (
    <section style={{ marginTop: 36 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>Customers Also Bought</h2>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 6, scrollSnapType: "x mandatory" }}>
        {recommendations.map((item) => (
          <article
            key={item.productId}
            onClick={() => navigate(`/products/${item.productId}`)}
            style={{
              minWidth: 230,
              maxWidth: 230,
              cursor: "pointer",
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
              scrollSnapAlign: "start",
            }}
          >
            <img
              src={item.image || ""}
              alt={item.productName}
              style={{ width: "100%", height: 130, objectFit: "cover", background: "#0f172a" }}
            />
            <div style={{ padding: 12 }}>
              <div
                style={{
                  display: "inline-block",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  ...badgeStyle(item.relationshipType),
                }}
              >
                {item.relationshipType === "co_purchase" || item.relationshipType === "both"
                  ? "Bought Together"
                  : "Similar"}
              </div>
              <h3 style={{ fontSize: 14, margin: "8px 0 4px", lineHeight: 1.35 }}>{item.productName}</h3>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>{item.category || "Uncategorized"}</p>
              <p style={{ margin: "8px 0 0", color: "#4ade80", fontWeight: 700, fontSize: 14 }}>
                Rs. {Number(item.minPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

