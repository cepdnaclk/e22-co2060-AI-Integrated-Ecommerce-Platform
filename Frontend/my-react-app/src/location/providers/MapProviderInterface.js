/**
 * @typedef {Object} Coordinates
 * @property {number} lat
 * @property {number} lng
 *
 * @typedef {Object} AddressResult
 * @property {number} lat
 * @property {number} lng
 * @property {string} placeId
 * @property {string} provider
 * @property {string} country
 * @property {string} state
 * @property {string} city
 * @property {string} postalCode
 * @property {string} street
 * @property {string} formattedAddress
 * @property {Object<string, unknown>} [raw]
 */

const REQUIRED_METHODS = [
  "getProviderName",
  "detectCurrentLocation",
  "reverseGeocode",
  "searchAddress",
];

export function assertMapProviderInterface(provider) {
  if (!provider || typeof provider !== "object") {
    throw new Error("Map provider is not an object");
  }

  for (const methodName of REQUIRED_METHODS) {
    if (typeof provider[methodName] !== "function") {
      throw new Error(`Map provider does not implement '${methodName}'`);
    }
  }

  return provider;
}

