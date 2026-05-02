import { TTLCache } from "./cacheStore";

const DEFAULT_BASE_URL = "https://nominatim.openstreetmap.org";

function toQueryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      search.set(key, `${value}`);
    }
  }
  return search.toString();
}

function normalizeKey(input) {
  return `${input || ""}`.trim().toLowerCase();
}

export function createNominatimClient(config = {}) {
  const {
    baseUrl = DEFAULT_BASE_URL,
    email = "",
    minIntervalMs = 1100,
    timeoutMs = 10000,
    cacheTtlMs = 10 * 60 * 1000,
    maxCacheEntries = 500,
  } = config;

  const cache = new TTLCache({ ttlMs: cacheTtlMs, maxEntries: maxCacheEntries });
  let queue = Promise.resolve();
  let lastRequestAt = 0;

  const scheduleRequest = (requestFn) => {
    const task = async () => {
      const elapsed = Date.now() - lastRequestAt;
      const waitMs = Math.max(0, minIntervalMs - elapsed);
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      const result = await requestFn();
      lastRequestAt = Date.now();
      return result;
    };

    const scheduled = queue
      .catch(() => undefined)
      .then(task);

    queue = scheduled;
    return scheduled;
  };

  const requestJson = async (path, params, cacheKey) => {
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const query = {
      format: "jsonv2",
      ...params,
    };

    if (email) {
      query.email = email;
    }

    const url = `${baseUrl}${path}?${toQueryString(query)}`;

    const responseData = await scheduleRequest(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Nominatim error ${response.status}`);
        }

        return await response.json();
      } finally {
        clearTimeout(timeoutId);
      }
    });

    cache.set(cacheKey, responseData);
    return responseData;
  };

  return {
    async search(query, options = {}) {
      const q = normalizeKey(query);
      if (!q) return [];

      const {
        limit = 5,
        addressdetails = 1,
        countrycodes = "",
        acceptLanguage = "en",
      } = options;

      const cacheKey = `search:${q}:${limit}:${countrycodes}:${acceptLanguage}`;
      return requestJson("/search", {
        q,
        limit,
        addressdetails,
        countrycodes,
        "accept-language": acceptLanguage,
      }, cacheKey);
    },

    async reverse(lat, lng, options = {}) {
      const {
        zoom = 18,
        addressdetails = 1,
        acceptLanguage = "en",
      } = options;

      const cacheKey = `reverse:${Number(lat).toFixed(6)}:${Number(lng).toFixed(6)}:${zoom}:${acceptLanguage}`;

      return requestJson("/reverse", {
        lat,
        lon: lng,
        zoom,
        addressdetails,
        "accept-language": acceptLanguage,
      }, cacheKey);
    },
  };
}

