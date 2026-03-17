import axios from "axios";

const RESTOCK_ML_API = process.env.RESTOCK_ML_API || "http://localhost:8001";

/**
 * ======================================================
 * RESTOCK ML SERVICE
 * ======================================================
 * Communicates with the Restock Priority ML microservice
 * (FastAPI running on port 8001) for inventory scoring.
 * ======================================================
 */

/**
 * Score a single SKU for restock priority.
 */
export const scoreSingleSKU = async (skuData) => {
  try {
    const response = await axios.post(
      `${RESTOCK_ML_API}/score/single`,
      skuData,
      { timeout: 30000 }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Restock ML score/single error:", error.message);
    throw error;
  }
};

/**
 * Score a batch of SKUs for restock priority.
 */
export const scoreBatchSKUs = async (skuList) => {
  try {
    const response = await axios.post(
      `${RESTOCK_ML_API}/score/batch`,
      { items: skuList },
      { timeout: 60000 }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Restock ML score/batch error:", error.message);
    throw error;
  }
};

/**
 * Get all critical SKUs above a threshold.
 */
export const getCriticalSKUs = async (threshold = 0.75) => {
  try {
    const response = await axios.get(
      `${RESTOCK_ML_API}/score/critical`,
      { params: { threshold }, timeout: 15000 }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Restock ML score/critical error:", error.message);
    throw error;
  }
};

/**
 * Get current weight configuration.
 */
export const getCurrentWeights = async () => {
  try {
    const response = await axios.get(`${RESTOCK_ML_API}/weights/current`, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Restock ML weights/current error:", error.message);
    throw error;
  }
};

/**
 * Recalculate weights with updated external factors.
 */
export const recalculateWeights = async (externalFactors) => {
  try {
    const response = await axios.post(
      `${RESTOCK_ML_API}/weights/recalculate`,
      externalFactors,
      { timeout: 15000 }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Restock ML weights/recalculate error:", error.message);
    throw error;
  }
};

/**
 * Get SHAP explanation for a specific SKU.
 */
export const explainSKU = async (skuId) => {
  try {
    const response = await axios.get(
      `${RESTOCK_ML_API}/explain/${encodeURIComponent(skuId)}`,
      { timeout: 30000 }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Restock ML explain error:", error.message);
    throw error;
  }
};

/**
 * Submit restock feedback for model improvement.
 */
export const submitFeedback = async (skuId, feedbackData) => {
  try {
    const response = await axios.post(
      `${RESTOCK_ML_API}/feedback/${encodeURIComponent(skuId)}`,
      feedbackData,
      { timeout: 10000 }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Restock ML feedback error:", error.message);
    throw error;
  }
};

/**
 * Check ML service health.
 */
export const checkHealth = async () => {
  try {
    const response = await axios.get(`${RESTOCK_ML_API}/health`, {
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    console.error("❌ Restock ML health check failed:", error.message);
    return { status: "unavailable", error: error.message };
  }
};
