import CourierBranch from "../dms/models/courierBranch.js";

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
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

/**
 * Finds the closest CourierBranch to a given location (e.g. Seller location)
 */
export async function findClosestBranch(location) {
  const branches = await CourierBranch.find({ status: "approved" });
  if (!branches || branches.length === 0) return null;

  let closest = null;
  let minDistance = Infinity;

  branches.forEach((branch) => {
    if (branch.location && branch.location.lat && branch.location.lng) {
      const dist = calculateDistance(
        location.lat,
        location.lng,
        branch.location.lat,
        branch.location.lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        closest = branch;
      }
    }
  });

  return closest;
}

/**
 * Calculates delivery charge from a branch to a customer
 */
export function calculateDeliveryFee(branchLocation, customerLocation) {
  const distance = calculateDistance(
    branchLocation.lat,
    branchLocation.lng,
    customerLocation.lat,
    customerLocation.lng
  );

  // Configuration (Could be moved to a settings model later)
  const baseFee = 150; // Rs. 150 base fee
  const ratePerKm = 25; // Rs. 25 per km

  if (distance === Infinity) return baseFee; // Fallback

  const variableFee = distance * ratePerKm;
  return Math.round(baseFee + variableFee);
}

/**
 * Comprehensive calculation for an order from a seller to a customer
 */
export async function getOrderDeliveryCharge(sellerLocation, customerLocation) {
  // Ensure we have numbers
  const sLat = sellerLocation?.lat ? parseFloat(sellerLocation.lat) : null;
  const sLng = sellerLocation?.lng ? parseFloat(sellerLocation.lng) : null;
  const cLat = customerLocation?.lat ? parseFloat(customerLocation.lat) : null;
  const cLng = customerLocation?.lng ? parseFloat(customerLocation.lng) : null;

  console.log("🚚 [DeliveryService] Inputs:", { 
    seller: { lat: sLat, lng: sLng }, 
    customer: { lat: cLat, lng: cLng } 
  });

  if (sLat === null || sLng === null || cLat === null || cLng === null) {
    console.log("⚠️ [DeliveryService] Missing coordinates, using fallback fee Rs. 250");
    return 250; 
  }

  const closestBranch = await findClosestBranch({ lat: sLat, lng: sLng });
  if (!closestBranch) {
    console.log("❌ [DeliveryService] No branch found for seller location");
    return 300; 
  }

  const bLat = parseFloat(closestBranch.location.lat);
  const bLng = parseFloat(closestBranch.location.lng);

  const distance = calculateDistance(bLat, bLng, cLat, cLng);
  
  const baseFee = 150;
  const ratePerKm = 25;
  const fee = Math.round(baseFee + (distance * ratePerKm));

  console.log(`✅ [DeliveryService] Calculated: Branch(${closestBranch.branchCode}) -> Customer: ${distance.toFixed(2)}km | Fee: Rs. ${fee}`);
  
  return fee;
}
