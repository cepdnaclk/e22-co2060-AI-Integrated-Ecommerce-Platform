import ShipmentTrackingEvent from "../models/shipmentTrackingEvent.js";

function hasRequiredScanBeforeDelivered(recentScanTypes = []) {
  return recentScanTypes.includes("branch_received") && recentScanTypes.includes("out_for_delivery");
}

export async function detectScanAnomalies({
  deliveryOrderId,
  scanType,
  scannedByStaffId = null,
}) {
  const anomalies = [];

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const duplicateRecent = await ShipmentTrackingEvent.findOne({
    deliveryOrderId,
    scanType,
    scannedByStaffId: scannedByStaffId || null,
    occurredAt: { $gte: fiveMinutesAgo },
  }).lean();

  if (duplicateRecent) {
    anomalies.push("duplicate_scan_detected");
  }

  if (scanType === "delivered") {
    const recent = await ShipmentTrackingEvent.find({ deliveryOrderId })
      .sort({ occurredAt: -1 })
      .limit(8)
      .select("scanType")
      .lean();

    const recentTypes = recent.map((row) => row.scanType);
    if (!hasRequiredScanBeforeDelivered(recentTypes)) {
      anomalies.push("missing_scan_sequence");
    }
  }

  return {
    anomalies,
    suspicious: anomalies.length > 0,
    anomalyScore: anomalies.length * 20,
  };
}

