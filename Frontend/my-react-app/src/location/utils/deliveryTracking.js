export function createDeliveryTrackingState({
  orderId,
  customerLocation,
  riderLocation = null,
  route = null,
  etaMinutes = null,
  status = "pending",
}) {
  return {
    orderId,
    status,
    customerLocation,
    riderLocation,
    route,
    etaMinutes,
    updatedAt: new Date().toISOString(),
  };
}

