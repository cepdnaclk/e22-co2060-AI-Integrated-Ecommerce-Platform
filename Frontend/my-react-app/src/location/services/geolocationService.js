const DEFAULT_GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 0,
};

export function mapGeolocationError(error) {
  const fallbackMessage = "Unable to retrieve your location";
  const code = Number(error?.code);

  if (code === 1) {
    return {
      code: "PERMISSION_DENIED",
      message: "Location permission denied by user",
      retriable: false,
      originalError: error,
    };
  }

  if (code === 2) {
    return {
      code: "POSITION_UNAVAILABLE",
      message: "Location position is unavailable",
      retriable: true,
      originalError: error,
    };
  }

  if (code === 3) {
    return {
      code: "TIMEOUT",
      message: "Location request timed out",
      retriable: true,
      originalError: error,
    };
  }

  return {
    code: "UNKNOWN",
    message: error?.message || fallbackMessage,
    retriable: true,
    originalError: error,
  };
}

export function getCurrentPosition(options = {}) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw {
      code: "NOT_SUPPORTED",
      message: "Geolocation is not supported in this browser",
      retriable: false,
    };
  }

  const mergedOptions = {
    ...DEFAULT_GEO_OPTIONS,
    ...options,
  };

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      reject(mapGeolocationError(error));
    }, mergedOptions);
  });
}

export async function getCurrentPositionWithRetry(options = {}) {
  const {
    retries = 2,
    retryDelayMs = 900,
    ...geoOptions
  } = options;

  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    try {
      return await getCurrentPosition(geoOptions);
    } catch (error) {
      lastError = error;

      if (!error?.retriable || attempt === retries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      attempt += 1;
    }
  }

  throw lastError || { code: "UNKNOWN", message: "Unknown geolocation error", retriable: false };
}

