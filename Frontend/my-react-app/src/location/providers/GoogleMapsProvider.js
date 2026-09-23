import { assertMapProviderInterface } from "./MapProviderInterface";

function notImplementedError(methodName) {
  return new Error(
    `GoogleMapsProvider.${methodName} is not implemented yet. ` +
      "Set VITE_MAP_PROVIDER=osm until Google Maps APIs are enabled."
  );
}

export class GoogleMapsProvider {
  getProviderName() {
    return "google";
  }

  async detectCurrentLocation() {
    throw notImplementedError("detectCurrentLocation");
  }

  async reverseGeocode() {
    throw notImplementedError("reverseGeocode");
  }

  async searchAddress() {
    throw notImplementedError("searchAddress");
  }

  async getRoute() {
    throw notImplementedError("getRoute");
  }
}

assertMapProviderInterface(new GoogleMapsProvider());

