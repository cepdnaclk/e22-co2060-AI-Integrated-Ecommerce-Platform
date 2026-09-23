import { useEffect, useState } from "react";
import { fetchRecommendations } from "../services/recommendationService";

export function useRecommendations(productId, topN = 8) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!productId) {
      setRecommendations([]);
      return;
    }

    const key = `reco_${productId}_${topN}`;
    const cached = sessionStorage.getItem(key);
    if (cached) {
      setRecommendations(JSON.parse(cached));
      return;
    }

    setLoading(true);
    setError("");
    fetchRecommendations(productId, topN)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data.recommendations) ? data.recommendations : [];
        setRecommendations(list);
        sessionStorage.setItem(key, JSON.stringify(list));
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load recommendations");
        setRecommendations([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId, topN]);

  return { recommendations, loading, error };
}

