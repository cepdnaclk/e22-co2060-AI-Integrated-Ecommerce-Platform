const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(pointA, pointB) {
  if (!pointA || !pointB) return Number.POSITIVE_INFINITY;

  const lat1 = Number(pointA.lat);
  const lng1 = Number(pointA.lng);
  const lat2 = Number(pointB.lat);
  const lng2 = Number(pointB.lng);

  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) {
    return Number.POSITIVE_INFINITY;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function findEntitiesWithinRadius(center, entities = [], radiusKm = 5) {
  return entities
    .map((entity) => {
      const distanceKm = haversineDistanceKm(center, entity);
      return { ...entity, distanceKm };
    })
    .filter((entity) => entity.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

