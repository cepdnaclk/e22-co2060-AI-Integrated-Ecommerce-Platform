import { getCache, setCache } from "../services/cacheService.js";

/**
 * Express 5 compatible route caching middleware with safe error handling
 * @param {number} ttlSeconds - Cache duration in seconds (default 300s / 5 min)
 */
export function cacheRoute(ttlSeconds = 300) {
  return async (req, res, next) => {
    if (req.method !== "GET") return next();

    const cacheKey = `api_cache:${req.originalUrl || req.url}`;

    try {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cachedData);
      }
    } catch (err) {
      console.warn("⚠️ Cache get error:", err.message);
    }

    const _json = res.json;
    res.json = function (data) {
      res.setHeader("X-Cache", "MISS");
      try {
        if (res.statusCode === 200 && data) {
          // Fire and forget, completely non-blocking
          setCache(cacheKey, data, ttlSeconds).catch(() => {});
        }
      } catch (err) {
        console.warn("⚠️ Cache save skipped:", err.message);
      }
      return _json.call(this, data);
    };

    next();
  };
}
