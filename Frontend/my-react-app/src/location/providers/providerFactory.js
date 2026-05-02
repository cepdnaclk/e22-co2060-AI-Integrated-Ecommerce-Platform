import { OpenStreetMapProvider } from "./OpenStreetMapProvider";
import { GoogleMapsProvider } from "./GoogleMapsProvider";
import { assertMapProviderInterface } from "./MapProviderInterface";

export const MAP_PROVIDER = (import.meta.env.VITE_MAP_PROVIDER || "osm").toLowerCase();

let providerSingleton = null;

function buildProviderConfig() {
  return {
    nominatimBaseUrl: import.meta.env.VITE_NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org",
    nominatimEmail: import.meta.env.VITE_NOMINATIM_EMAIL || "",
    nominatimMinIntervalMs: Number(import.meta.env.VITE_NOMINATIM_MIN_INTERVAL_MS || 1100),
    nominatimTimeoutMs: Number(import.meta.env.VITE_NOMINATIM_TIMEOUT_MS || 10000),
    nominatimCacheTtlMs: Number(import.meta.env.VITE_NOMINATIM_CACHE_TTL_MS || 10 * 60 * 1000),
    nominatimMaxCacheEntries: Number(import.meta.env.VITE_NOMINATIM_CACHE_MAX_ENTRIES || 500),
    routingProvider: (import.meta.env.VITE_ROUTING_PROVIDER || "osrm").toLowerCase(),
    osrmBaseUrl: import.meta.env.VITE_OSRM_BASE_URL || "https://router.project-osrm.org",
    graphHopperBaseUrl: import.meta.env.VITE_GRAPHHOPPER_BASE_URL || "https://graphhopper.com/api/1",
    graphHopperApiKey: import.meta.env.VITE_GRAPHHOPPER_API_KEY || "",
  };
}

function createMapProvider(providerName) {
  const config = buildProviderConfig();

  if (providerName === "google") {
    return new GoogleMapsProvider(config);
  }

  return new OpenStreetMapProvider(config);
}

export function getConfiguredMapProvider(providerName = MAP_PROVIDER) {
  if (!providerSingleton || providerSingleton.getProviderName() !== providerName) {
    providerSingleton = assertMapProviderInterface(createMapProvider(providerName));
  }
  return providerSingleton;
}

