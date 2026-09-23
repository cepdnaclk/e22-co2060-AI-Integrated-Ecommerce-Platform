function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return Infinity;

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Test Kandy to Colombo
const d1 = calculateDistance(7.2906, 80.6337, 6.9271, 79.8612);
console.log("Kandy to Colombo:", d1, "km");

// Test Kandy to Galle
const d2 = calculateDistance(7.2906, 80.6337, 6.0535, 80.221);
console.log("Kandy to Galle:", d2, "km");
