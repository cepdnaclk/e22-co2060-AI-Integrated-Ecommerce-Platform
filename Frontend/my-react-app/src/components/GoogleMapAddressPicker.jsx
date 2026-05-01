import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { buildAddressLocationPayload, locationService } from "../location/services/locationService";

const DEFAULT_CENTER = { lat: 7.8731, lng: 80.7718 };
const DEFAULT_ZOOM = 7;
const SELECTED_ZOOM = 17;
const SEARCH_DEBOUNCE_MS = 450;

const TILE_SOURCES = [
  {
    name: "OpenStreetMap Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    name: "OpenStreetMap HOT",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    name: "OpenStreetMap DE",
    url: "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
];

const MAP_MARKER_ICON = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

const S = {
  wrapper: {
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    background: "rgba(0,0,0,0.25)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#e2e8f0",
    fontSize: 14,
    fontFamily: "inherit",
  },
  actionBtn: {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#cbd5e1",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  confirmBtn: {
    width: "100%",
    border: "none",
    borderTop: "1px solid rgba(34,197,94,0.15)",
    background: "linear-gradient(135deg, #059669, #10b981)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    padding: "12px 0",
    cursor: "pointer",
  },
  infoCard: {
    padding: "10px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  footer: {
    padding: "8px 14px",
    background: "rgba(0,0,0,0.2)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    fontSize: 11,
    color: "#64748b",
  },
};

function formatCoordinates(lat, lng) {
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
}

function MapViewportController({ center, zoom }) {
  const map = useMap();
  const centerLat = center?.lat;
  const centerLng = center?.lng;

  useEffect(() => {
    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) return;
    map.setView([centerLat, centerLng], zoom, { animate: true });
  }, [centerLat, centerLng, map, zoom]);

  return null;
}

function MapClickHandler({ disabled, onPick }) {
  useMapEvents({
    click(event) {
      if (disabled) return;
      onPick({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

const EMPTY_LOCATION = {
  lat: null,
  lng: null,
  placeId: "",
  provider: "",
  accuracy: null,
  timestamp: "",
  country: "",
  state: "",
  city: "",
  postalCode: "",
  street: "",
  formattedAddress: "",
  verified: false,
};

const GoogleMapAddressPicker = ({
  address,
  addressLocation,
  onAddressChange,
  readOnly = false,
}) => {
  const initialMarker =
    Number.isFinite(Number(addressLocation?.lat)) && Number.isFinite(Number(addressLocation?.lng))
      ? { lat: Number(addressLocation.lat), lng: Number(addressLocation.lng) }
      : null;

  const [stage, setStage] = useState(addressLocation?.verified && initialMarker ? "locked" : "searching");
  const [marker, setMarker] = useState(initialMarker);
  const [mapCenter, setMapCenter] = useState(initialMarker || DEFAULT_CENTER);
  const [zoom, setZoom] = useState(initialMarker ? SELECTED_ZOOM : DEFAULT_ZOOM);
  const [accuracy, setAccuracy] = useState(Number.isFinite(Number(addressLocation?.accuracy)) ? Number(addressLocation.accuracy) : null);
  const [inputValue, setInputValue] = useState(address || "");
  const [previewLocation, setPreviewLocation] = useState({
    ...EMPTY_LOCATION,
    ...addressLocation,
    formattedAddress: addressLocation?.formattedAddress || address || "",
    provider: addressLocation?.provider || locationService.getProviderName(),
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [tileIndex, setTileIndex] = useState(0);
  const [tileErrors, setTileErrors] = useState(0);
  const searchRequestIdRef = useRef(0);

  const activeTile = TILE_SOURCES[tileIndex];

  const emitAddressChange = useCallback((nextLocation) => {
    const normalized = buildAddressLocationPayload(nextLocation, {
      lat: nextLocation.lat,
      lng: nextLocation.lng,
      accuracy: nextLocation.accuracy,
      timestamp: nextLocation.timestamp,
      verified: nextLocation.verified,
    });

    onAddressChange?.({
      address: normalized.formattedAddress,
      addressLocation: normalized,
    });
  }, [onAddressChange]);

  const previewPoint = useCallback((baseLocation, options = {}) => {
    const payload = buildAddressLocationPayload(baseLocation, {
      lat: options.lat ?? baseLocation.lat,
      lng: options.lng ?? baseLocation.lng,
      accuracy: options.accuracy ?? baseLocation.accuracy,
      timestamp: options.timestamp ?? baseLocation.timestamp,
      verified: Boolean(options.verified),
    });

    if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
      return;
    }

    setMarker({ lat: payload.lat, lng: payload.lng });
    setMapCenter({ lat: payload.lat, lng: payload.lng });
    setZoom(SELECTED_ZOOM);
    setAccuracy(payload.accuracy);
    setPreviewLocation(payload);
    setInputValue(payload.formattedAddress || formatCoordinates(payload.lat, payload.lng));
    setStage(payload.verified ? "locked" : "previewing");
  }, []);

  const reverseAndPreview = useCallback(async ({ lat, lng, accuracyValue = null, timestamp = "" }) => {
    try {
      const reversed = await locationService.reverseGeocode({
        lat,
        lng,
        acceptLanguage: typeof navigator !== "undefined" ? navigator.language : "en",
      });

      previewPoint(reversed, {
        lat,
        lng,
        accuracy: accuracyValue,
        timestamp: timestamp || new Date().toISOString(),
      });
      setActionMessage("");
    } catch {
      previewPoint({
        lat,
        lng,
        provider: locationService.getProviderName(),
        formattedAddress: formatCoordinates(lat, lng),
      }, {
        lat,
        lng,
        accuracy: accuracyValue,
        timestamp: timestamp || new Date().toISOString(),
      });

      setActionMessage("Reverse geocoding is unavailable right now. Coordinates were used instead.");
    }
  }, [previewPoint]);

  const handleCurrentLocation = useCallback(async () => {
    try {
      const detected = await locationService.detectCurrentLocation({
        retries: 2,
        retryDelayMs: 900,
        enableHighAccuracy: true,
        timeout: 12000,
      });

      await reverseAndPreview({
        lat: detected.lat,
        lng: detected.lng,
        accuracyValue: detected.accuracy,
        timestamp: detected.timestamp,
      });
    } catch (error) {
      const code = error?.code || "UNKNOWN";
      const messageByCode = {
        PERMISSION_DENIED: "Location permission denied. Enable location access in your browser settings.",
        POSITION_UNAVAILABLE: "Could not determine your current location.",
        TIMEOUT: "Location request timed out. Please retry.",
        NOT_SUPPORTED: "This browser does not support geolocation.",
      };
      setActionMessage(messageByCode[code] || "Unable to detect current location.");
    }
  }, [reverseAndPreview]);

  const handleSearchPick = useCallback((result) => {
    previewPoint(result, {
      lat: result.lat,
      lng: result.lng,
      timestamp: new Date().toISOString(),
    });
    setSearchResults([]);
    setSearchMessage("");
  }, [previewPoint]);

  const handleMapPick = useCallback(async ({ lat, lng }) => {
    await reverseAndPreview({ lat, lng, timestamp: new Date().toISOString() });
  }, [reverseAndPreview]);

  const handleMarkerDragEnd = useCallback(async (event) => {
    const lat = event.target.getLatLng().lat;
    const lng = event.target.getLatLng().lng;
    await reverseAndPreview({ lat, lng, timestamp: new Date().toISOString() });
  }, [reverseAndPreview]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (readOnly || stage === "locked") {
        return;
      }

      const query = inputValue.trim();
      if (query.length < 3) {
        setSearchResults([]);
        setSearchMessage(query.length === 0 ? "" : "Type at least 3 characters");
        setSearchLoading(false);
        return;
      }

      const requestId = ++searchRequestIdRef.current;
      setSearchLoading(true);
      setSearchMessage("");

      try {
        const results = await locationService.searchAddress({
          query,
          limit: 5,
          acceptLanguage: typeof navigator !== "undefined" ? navigator.language : "en",
        });

        if (requestId !== searchRequestIdRef.current) return;
        setSearchResults(results);
        setSearchMessage(results.length ? "" : "No matching addresses found.");
      } catch {
        if (requestId !== searchRequestIdRef.current) return;
        setSearchResults([]);
        setSearchMessage("Search failed. Please try again.");
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setSearchLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [inputValue, readOnly, stage]);

  const confirmLocation = useCallback(() => {
    if (!marker) return;

    const confirmed = buildAddressLocationPayload(previewLocation, {
      lat: marker.lat,
      lng: marker.lng,
      accuracy,
      timestamp: previewLocation.timestamp || new Date().toISOString(),
      verified: true,
    });

    setPreviewLocation(confirmed);
    setStage("locked");
    emitAddressChange(confirmed);
  }, [accuracy, emitAddressChange, marker, previewLocation]);

  const unlockSelection = useCallback(() => {
    setStage("searching");
    setActionMessage("");
  }, []);

  const tileEventHandlers = useMemo(() => ({
    tileerror: () => {
      setTileErrors((previous) => {
        const next = previous + 1;
        if (next < 4) return next;
        setTileIndex((current) => (current < TILE_SOURCES.length - 1 ? current + 1 : current));
        return 0;
      });
    },
    load: () => setTileErrors(0),
  }), []);

  const locationSummary = previewLocation.formattedAddress || address || "No address selected";
  const providerLabel = locationService.getProviderName().toUpperCase();

  return (
    <div style={S.wrapper}>
      {!readOnly && stage !== "locked" && (
        <div style={S.searchRow}>
          <span style={{ color: "#64748b", fontSize: 14 }}>🔍</span>
          <input
            type="text"
            style={S.searchInput}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Search address, city, or landmark..."
            autoComplete="off"
          />
          <button type="button" style={S.actionBtn} onClick={handleCurrentLocation}>
            Use GPS
          </button>
        </div>
      )}

      {(stage === "locked" || readOnly) && (
        <div style={{ ...S.infoCard, background: "rgba(34,197,94,0.06)", borderBottom: "1px solid rgba(34,197,94,0.16)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600, lineHeight: 1.35 }}>{locationSummary}</div>
              {marker && <div style={{ fontSize: 11, marginTop: 4, color: "#64748b" }}>{formatCoordinates(marker.lat, marker.lng)}</div>}
              <div style={{ marginTop: 6, fontSize: 10, color: "#4ade80", fontWeight: 700 }}>VERIFIED LOCATION</div>
            </div>
            {!readOnly && (
              <button type="button" style={S.actionBtn} onClick={unlockSelection}>
                Change
              </button>
            )}
          </div>
        </div>
      )}

      {!readOnly && stage !== "locked" && (searchLoading || searchMessage || searchResults.length > 0) && (
        <div style={{ ...S.infoCard, background: "rgba(59,130,246,0.08)" }}>
          {searchLoading && <div style={{ fontSize: 12, color: "#93c5fd" }}>Searching...</div>}
          {!searchLoading && searchMessage && (
            <div style={{ fontSize: 12, color: "#93c5fd" }}>{searchMessage}</div>
          )}
          {!searchLoading && searchResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {searchResults.map((result) => (
                <button
                  key={`${result.placeId}-${result.lat}-${result.lng}`}
                  type="button"
                  onClick={() => handleSearchPick(result)}
                  style={{
                    textAlign: "left",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#e2e8f0",
                    borderRadius: 8,
                    padding: "8px 10px",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {result.formattedAddress}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {actionMessage && (
        <div style={{ ...S.infoCard, background: "rgba(251,191,36,0.12)", color: "#facc15", fontSize: 12 }}>
          {actionMessage}
        </div>
      )}

      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={zoom}
        style={{ height: readOnly ? 220 : 300, width: "100%" }}
        zoomControl={true}
        scrollWheelZoom={!readOnly}
        dragging={!readOnly}
        attributionControl={true}
      >
        <MapViewportController center={mapCenter} zoom={zoom} />
        <MapClickHandler disabled={readOnly || stage === "locked"} onPick={handleMapPick} />
        <TileLayer
          key={activeTile.name}
          url={activeTile.url}
          attribution={activeTile.attribution}
          eventHandlers={tileEventHandlers}
        />
        {marker && (
          <Marker
            icon={MAP_MARKER_ICON}
            position={[marker.lat, marker.lng]}
            draggable={!readOnly && stage !== "locked"}
            eventHandlers={{
              dragend: handleMarkerDragEnd,
            }}
          />
        )}
        {marker && Number.isFinite(Number(accuracy)) && Number(accuracy) > 0 && (
          <Circle
            center={[marker.lat, marker.lng]}
            radius={Number(accuracy)}
            pathOptions={{
              color: "rgba(56,189,248,0.9)",
              fillColor: "rgba(56,189,248,0.2)",
              fillOpacity: 0.35,
              weight: 1,
            }}
          />
        )}
      </MapContainer>

      {!readOnly && stage === "previewing" && marker && (
        <button type="button" style={S.confirmBtn} onClick={confirmLocation}>
          Confirm This Location
        </button>
      )}

      <div style={S.footer}>
        Provider: {providerLabel} • Tiles: {activeTile.name}
        {tileErrors > 0 ? ` • Tile retries: ${tileErrors}` : ""}
      </div>
    </div>
  );
};

export default GoogleMapAddressPicker;

