const DEFAULT_OSRM_BASE_URL = "https://router.project-osrm.org";
const DEFAULT_GRAPHHOPPER_BASE_URL = "https://graphhopper.com/api/1";

function encodeCoordinate(point) {
  return `${point.lng},${point.lat}`;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Routing request failed with status ${response.status}`);
  }

  return response.json();
}

export function createRoutingService(config = {}) {
  const {
    routingProvider = "osrm",
    osrmBaseUrl = DEFAULT_OSRM_BASE_URL,
    graphHopperBaseUrl = DEFAULT_GRAPHHOPPER_BASE_URL,
    graphHopperApiKey = "",
  } = config;

  return {
    async getRoute({ origin, destination, profile = "driving" }) {
      if (!origin || !destination) {
        throw new Error("Routing requires origin and destination coordinates");
      }

      if (routingProvider === "graphhopper") {
        if (!graphHopperApiKey) {
          throw new Error("GraphHopper API key is not configured");
        }

        const routeUrl = `${graphHopperBaseUrl}/route?point=${origin.lat},${origin.lng}&point=${destination.lat},${destination.lng}&profile=${profile}&points_encoded=false&key=${graphHopperApiKey}`;
        const data = await fetchJson(routeUrl);
        const bestPath = data?.paths?.[0];

        if (!bestPath) {
          throw new Error("No route available");
        }

        return {
          distanceMeters: bestPath.distance,
          durationSeconds: Math.round(bestPath.time / 1000),
          geometry: bestPath.points,
          provider: "graphhopper",
        };
      }

      const osrmProfile = profile === "walking" ? "walking" : "driving";
      const coordinates = `${encodeCoordinate(origin)};${encodeCoordinate(destination)}`;
      const routeUrl = `${osrmBaseUrl}/route/v1/${osrmProfile}/${coordinates}?overview=full&geometries=geojson`;

      const data = await fetchJson(routeUrl);
      const bestRoute = data?.routes?.[0];

      if (!bestRoute) {
        throw new Error("No route available");
      }

      return {
        distanceMeters: bestRoute.distance,
        durationSeconds: bestRoute.duration,
        geometry: bestRoute.geometry,
        provider: "osrm",
      };
    },
  };
}

