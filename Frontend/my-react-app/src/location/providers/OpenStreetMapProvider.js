import { assertMapProviderInterface } from "./MapProviderInterface";
import { getCurrentPositionWithRetry } from "../services/geolocationService";
import { createNominatimClient } from "../services/nominatimClient";
import { createRoutingService } from "../services/routingService";

function pickCity(address = {}) {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.municipality ||
    ""
  );
}

function buildStreet(address = {}) {
  return [address.house_number, address.road, address.suburb]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeGeocodeResult(raw = {}) {
  const address = raw.address || {};

  return {
    lat: Number(raw.lat),
    lng: Number(raw.lon),
    placeId: `${raw.place_id || ""}`,
    provider: "osm",
    country: address.country || "",
    state: address.state || address.region || "",
    city: pickCity(address),
    postalCode: address.postcode || "",
    street: buildStreet(address),
    formattedAddress: raw.display_name || "",
    raw,
  };
}

export class OpenStreetMapProvider {
  constructor(config = {}) {
    this.providerName = "osm";
    this.nominatim = createNominatimClient({
      baseUrl: config.nominatimBaseUrl,
      email: config.nominatimEmail,
      minIntervalMs: config.nominatimMinIntervalMs,
      timeoutMs: config.nominatimTimeoutMs,
      cacheTtlMs: config.nominatimCacheTtlMs,
      maxCacheEntries: config.nominatimMaxCacheEntries,
    });

    this.routing = createRoutingService({
      routingProvider: config.routingProvider,
      osrmBaseUrl: config.osrmBaseUrl,
      graphHopperBaseUrl: config.graphHopperBaseUrl,
      graphHopperApiKey: config.graphHopperApiKey,
    });
  }

  getProviderName() {
    return this.providerName;
  }

  async detectCurrentLocation(options = {}) {
    const position = await getCurrentPositionWithRetry(options);

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString(),
    };
  }

  async reverseGeocode({ lat, lng, acceptLanguage = "en" }) {
    const response = await this.nominatim.reverse(lat, lng, {
      acceptLanguage,
      zoom: 18,
      addressdetails: 1,
    });

    return normalizeGeocodeResult(response);
  }

  async searchAddress({ query, limit = 5, countryCodes = "", acceptLanguage = "en" }) {
    const results = await this.nominatim.search(query, {
      limit,
      countrycodes: countryCodes,
      acceptLanguage,
      addressdetails: 1,
    });

    return results
      .map(normalizeGeocodeResult)
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  }

  async getRoute({ origin, destination, profile = "driving" }) {
    return this.routing.getRoute({ origin, destination, profile });
  }
}

assertMapProviderInterface(new OpenStreetMapProvider());

