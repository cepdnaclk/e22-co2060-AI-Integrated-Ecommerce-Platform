import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  Autocomplete,
} from "@react-google-maps/api";

const LIBRARIES = ["places"];
const DEFAULT_CENTER = { lat: 7.8731, lng: 80.7718 };
const DEFAULT_ZOOM = 7;
const SELECTED_ZOOM = 17;

const mapContainerStyle = {
  width: "100%",
  height: 300,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.1)",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  clickableIcons: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#0e1626" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#255763" }] },
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  ],
};

/* ── Styles ── */
const S = {
  wrapper: {
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
  },
  searchRow: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 14px",
    background: "rgba(0,0,0,0.25)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  searchIcon: {
    fontSize: 16, color: "#64748b", flexShrink: 0,
  },
  searchInput: {
    flex: 1, background: "transparent", border: "none", outline: "none",
    color: "#e2e8f0", fontSize: 14, fontFamily: "inherit",
  },
  lockedCard: {
    display: "flex", alignItems: "flex-start", gap: 12,
    padding: "14px 16px",
    background: "rgba(34,197,94,0.06)",
    borderBottom: "1px solid rgba(34,197,94,0.15)",
  },
  lockedPin: {
    width: 36, height: 36, borderRadius: "50%",
    background: "rgba(34,197,94,0.15)", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
  },
  lockedText: {
    flex: 1, minWidth: 0,
  },
  lockedAddr: {
    fontSize: 14, color: "#e2e8f0", fontWeight: 600,
    lineHeight: 1.4, wordBreak: "break-word",
  },
  lockedCoords: {
    fontSize: 11, color: "#64748b", marginTop: 2,
  },
  verifiedBadge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.06em", color: "#4ade80",
    background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)",
    borderRadius: 20, padding: "3px 10px", marginTop: 6,
  },
  changeBtn: {
    flexShrink: 0, background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
    color: "#94a3b8", fontSize: 12, padding: "6px 14px",
    cursor: "pointer", fontWeight: 600, marginTop: 2,
    transition: "all 0.15s",
  },
  confirmBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    width: "100%", padding: "12px 0",
    background: "linear-gradient(135deg, #059669, #10b981)",
    border: "none", borderRadius: 0, color: "#fff",
    fontSize: 14, fontWeight: 700, cursor: "pointer",
    transition: "opacity 0.15s",
  },
  footer: {
    padding: "8px 14px",
    background: "rgba(0,0,0,0.2)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 11, color: "#64748b",
  },
};

/**
 * GoogleMapAddressPicker — Standard e-commerce address selector
 *
 * Flow: Type → Autocomplete → Select → Map locks on location → Confirm
 */
const GoogleMapAddressPicker = ({ address, addressLocation, onAddressChange, readOnly = false }) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: LIBRARIES,
  });

  // "searching" = typing/picking, "previewing" = place selected on map, "locked" = confirmed
  const [stage, setStage] = useState(
    addressLocation?.verified && addressLocation?.lat ? "locked" : "searching"
  );
  const [marker, setMarker] = useState(
    addressLocation?.lat && addressLocation?.lng
      ? { lat: addressLocation.lat, lng: addressLocation.lng }
      : null
  );
  const [inputValue, setInputValue] = useState(address || "");
  const [previewAddress, setPreviewAddress] = useState(address || "");
  const [previewPlaceId, setPreviewPlaceId] = useState(addressLocation?.placeId || "");
  const [mapCenter, setMapCenter] = useState(
    addressLocation?.lat && addressLocation?.lng
      ? { lat: addressLocation.lat, lng: addressLocation.lng }
      : DEFAULT_CENTER
  );
  const [zoom, setZoom] = useState(
    addressLocation?.lat ? SELECTED_ZOOM : DEFAULT_ZOOM
  );

  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const inputRef = useRef(null);

  // Sync when props change externally
  useEffect(() => {
    if (addressLocation?.verified && addressLocation?.lat) {
      setStage("locked");
      setMarker({ lat: addressLocation.lat, lng: addressLocation.lng });
      setMapCenter({ lat: addressLocation.lat, lng: addressLocation.lng });
      setPreviewAddress(address || "");
      setInputValue(address || "");
      setZoom(SELECTED_ZOOM);
    }
  }, []);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    if (window.google) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, []);

  const onAutocompleteLoad = useCallback((ac) => {
    autocompleteRef.current = ac;
  }, []);

  // Reverse geocode helper
  const reverseGeocode = useCallback((lat, lng, cb) => {
    if (!geocoderRef.current) {
      cb(`${lat.toFixed(6)}, ${lng.toFixed(6)}`, "");
      return;
    }
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        cb(results[0].formatted_address, results[0].place_id || "");
      } else {
        cb(`${lat.toFixed(6)}, ${lng.toFixed(6)}`, "");
      }
    });
  }, []);

  // ── Autocomplete selection ──
  const onPlaceChanged = useCallback(() => {
    const ac = autocompleteRef.current;
    if (!ac) return;
    const place = ac.getPlace();
    if (!place?.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const addr = place.formatted_address || place.name || "";
    const pid = place.place_id || "";

    setMarker({ lat, lng });
    setMapCenter({ lat, lng });
    setZoom(SELECTED_ZOOM);
    setPreviewAddress(addr);
    setPreviewPlaceId(pid);
    setInputValue(addr);
    setStage("previewing");
  }, []);

  // ── Map click ──
  const onMapClick = useCallback((e) => {
    if (readOnly || stage === "locked") return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
    setMapCenter({ lat, lng });
    setZoom(SELECTED_ZOOM);
    reverseGeocode(lat, lng, (addr, pid) => {
      setPreviewAddress(addr);
      setPreviewPlaceId(pid);
      setInputValue(addr);
      setStage("previewing");
    });
  }, [readOnly, stage, reverseGeocode]);

  // ── Marker drag end ──
  const onMarkerDragEnd = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
    setMapCenter({ lat, lng });
    reverseGeocode(lat, lng, (addr, pid) => {
      setPreviewAddress(addr);
      setPreviewPlaceId(pid);
      setInputValue(addr);
      setStage("previewing");
    });
  }, [reverseGeocode]);

  // ── Confirm selection — locks the address ──
  const confirmLocation = useCallback(() => {
    if (!marker) return;
    setStage("locked");
    onAddressChange?.({
      address: previewAddress,
      addressLocation: {
        lat: marker.lat, lng: marker.lng,
        placeId: previewPlaceId, verified: true,
      },
    });
  }, [marker, previewAddress, previewPlaceId, onAddressChange]);

  // ── Unlock to change ──
  const unlockAddress = useCallback(() => {
    setStage("searching");
    setInputValue(previewAddress);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [previewAddress]);

  // ── Manual typing ──
  const onInputChange = useCallback((e) => {
    setInputValue(e.target.value);
    // Reset preview when user types fresh
    if (stage === "previewing") {
      setStage("searching");
    }
  }, [stage]);

  // Use current location
  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMarker({ lat, lng });
        setMapCenter({ lat, lng });
        setZoom(SELECTED_ZOOM);
        reverseGeocode(lat, lng, (addr, pid) => {
          setPreviewAddress(addr);
          setPreviewPlaceId(pid);
          setInputValue(addr);
          setStage("previewing");
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }, [reverseGeocode]);

  // ── Fallback: no API key ──
  if (!apiKey || apiKey === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
    return (
      <div style={{ padding: 16, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 12, fontSize: 13, color: "#fbbf24" }}>
        <strong>⚠️ Google Maps API Key Required</strong>
        <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: 12 }}>
          Add your API key to <code>VITE_GOOGLE_MAPS_API_KEY</code> in the <code>.env</code> file.
          Enable <em>Maps JavaScript API</em> and <em>Places API</em> in Google Cloud Console.
        </p>
        {!readOnly && (
          <input type="text" className="pfield" value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onAddressChange?.({ address: e.target.value, addressLocation: { lat: null, lng: null, placeId: "", verified: false } });
            }}
            placeholder="Enter your address manually"
            style={{ width: "100%", marginTop: 12 }}
          />
        )}
        {readOnly && <p style={{ color: "#e2e8f0", marginTop: 8 }}>{address || "Not provided"}</p>}
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, fontSize: 13, color: "#f87171" }}>
        ❌ Failed to load Google Maps. Check your API key and network connection.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
        <div style={{ width: 24, height: 24, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #4ac6ff", borderRadius: "50%", animation: "_spin 1s linear infinite", margin: "0 auto 8px" }} />
        Loading Google Maps…
      </div>
    );
  }

  /* ─── Read-only mode ─── */
  if (readOnly) {
    return (
      <div style={S.wrapper}>
        {address && (
          <div style={S.lockedCard}>
            <div style={S.lockedPin}>📍</div>
            <div style={S.lockedText}>
              <div style={S.lockedAddr}>{address}</div>
              {addressLocation?.verified && <div style={S.verifiedBadge}>✓ Verified Location</div>}
            </div>
          </div>
        )}
        <GoogleMap
          mapContainerStyle={{ ...mapContainerStyle, borderRadius: 0, border: "none", height: 220 }}
          center={mapCenter} zoom={zoom}
          onLoad={onMapLoad} options={{ ...mapOptions, draggable: false, scrollwheel: false }}
        >
          {marker && <MarkerF position={marker} />}
        </GoogleMap>
      </div>
    );
  }

  /* ─── Editable mode ─── */
  return (
    <div style={S.wrapper}>

      {/* ── Locked state: address is confirmed ── */}
      {stage === "locked" && (
        <div style={S.lockedCard}>
          <div style={S.lockedPin}>📍</div>
          <div style={S.lockedText}>
            <div style={S.lockedAddr}>{previewAddress}</div>
            {marker && <div style={S.lockedCoords}>{marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}</div>}
            <div style={S.verifiedBadge}>✓ Verified Location</div>
          </div>
          <button style={S.changeBtn} onClick={unlockAddress}
            onMouseEnter={(e) => { e.target.style.color = "#e2e8f0"; e.target.style.borderColor = "rgba(255,255,255,0.25)"; }}
            onMouseLeave={(e) => { e.target.style.color = "#94a3b8"; e.target.style.borderColor = "rgba(255,255,255,0.12)"; }}
          >
            Change
          </button>
        </div>
      )}

      {/* ── Search bar (visible when not locked) ── */}
      {stage !== "locked" && (
        <div style={S.searchRow}>
          <span style={S.searchIcon}>🔍</span>
          <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={onInputChange}
              placeholder="Type your delivery address…"
              style={S.searchInput}
              autoFocus
            />
          </Autocomplete>
          <button onClick={useCurrentLocation} title="Use my current location"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 4, color: "#60a5fa", flexShrink: 0 }}
          >
            📌
          </button>
        </div>
      )}

      {/* ── Preview info bar ── */}
      {stage === "previewing" && previewAddress && (
        <div style={{ padding: "10px 14px", background: "rgba(59,130,246,0.08)", borderBottom: "1px solid rgba(59,130,246,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <span style={{ flex: 1, fontSize: 13, color: "#93c5fd", lineHeight: 1.3 }}>{previewAddress}</span>
        </div>
      )}

      {/* ── Map ── */}
      <GoogleMap
        mapContainerStyle={{ ...mapContainerStyle, borderRadius: 0, border: "none" }}
        center={mapCenter} zoom={zoom}
        onClick={onMapClick} onLoad={onMapLoad}
        options={{ ...mapOptions, draggableCursor: stage === "locked" ? "default" : "crosshair" }}
      >
        {marker && (
          <MarkerF
            position={marker}
            draggable={stage !== "locked"}
            onDragEnd={onMarkerDragEnd}
          />
        )}
      </GoogleMap>

      {/* ── Confirm button ── */}
      {stage === "previewing" && marker && (
        <button style={S.confirmBtn} onClick={confirmLocation}
          onMouseEnter={(e) => e.target.style.opacity = 0.9}
          onMouseLeave={(e) => e.target.style.opacity = 1}
        >
          ✓ Confirm This Location
        </button>
      )}

      {/* ── Footer hint ── */}
      <div style={S.footer}>
        {stage === "searching" && (
          <>💡 Type an address above, or click on the map to select a location</>
        )}
        {stage === "previewing" && (
          <>🔄 Drag the pin to adjust, then click <strong style={{ color: "#4ade80", margin: "0 3px" }}>Confirm</strong> to lock it</>
        )}
        {stage === "locked" && (
          <>✅ Address locked — click <strong style={{ color: "#94a3b8", margin: "0 3px" }}>Change</strong> to update</>
        )}
      </div>
    </div>
  );
};

export default GoogleMapAddressPicker;
