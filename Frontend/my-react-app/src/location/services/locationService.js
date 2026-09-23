import { getConfiguredMapProvider } from "../providers/providerFactory";

function formatCoordinates(lat, lng) {
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
}

function withSafeString(value) {
  return typeof value === "string" ? value : "";
}

export function buildAddressLocationPayload(location = {}, extra = {}) {
  const lat = Number(extra.lat ?? location.lat);
  const lng = Number(extra.lng ?? location.lng);
  const fallbackAddress = Number.isFinite(lat) && Number.isFinite(lng) ? formatCoordinates(lat, lng) : "";

  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    placeId: withSafeString(location.placeId),
    provider: withSafeString(location.provider) || getConfiguredMapProvider().getProviderName(),
    accuracy: Number.isFinite(extra.accuracy) ? extra.accuracy : Number.isFinite(location.accuracy) ? location.accuracy : null,
    timestamp: withSafeString(extra.timestamp || location.timestamp) || new Date().toISOString(),
    country: withSafeString(location.country),
    state: withSafeString(location.state),
    city: withSafeString(location.city),
    postalCode: withSafeString(location.postalCode),
    street: withSafeString(location.street),
    formattedAddress: withSafeString(location.formattedAddress) || fallbackAddress,
    verified: Boolean(extra.verified),
  };
}

export const locationService = {
  getProviderName() {
    return getConfiguredMapProvider().getProviderName();
  },

  async detectCurrentLocation(options = {}) {
    return getConfiguredMapProvider().detectCurrentLocation(options);
  },

  async reverseGeocode({ lat, lng, acceptLanguage = "en" }) {
    return getConfiguredMapProvider().reverseGeocode({ lat, lng, acceptLanguage });
  },

  async searchAddress({ query, limit = 5, countryCodes = "", acceptLanguage = "en" }) {
    return getConfiguredMapProvider().searchAddress({
      query,
      limit,
      countryCodes,
      acceptLanguage,
    });
  },

  async getRoute({ origin, destination, profile = "driving" }) {
    return getConfiguredMapProvider().getRoute({ origin, destination, profile });
  },
};

