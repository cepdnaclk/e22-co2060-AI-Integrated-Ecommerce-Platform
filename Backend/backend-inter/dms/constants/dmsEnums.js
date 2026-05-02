export const COURIER_COMPANY_STATUS = ["pending", "approved", "suspended"];
export const BRANCH_STATUS = ["pending", "approved", "disabled"];
export const STAFF_STATUS = ["pending", "active", "suspended"];
export const STAFF_ROLES = [
  "dms_admin",
  "company_admin",
  "branch_manager",
  "dispatch_operator",
  "warehouse_staff",
  "delivery_rider",
];

export const SHIPMENT_STATUS = [
  "shipment_registered",
  "received_at_branch",
  "in_sorting",
  "out_for_delivery",
  "delivered",
  "failed_delivery",
  "returned",
  "lost",
  "disputed",
];

export const SCAN_TYPES = [
  "branch_received",
  "branch_transfer",
  "out_for_delivery",
  "delivery_attempted",
  "delivered",
  "failed_delivery",
  "returned",
  "warehouse_sorted",
];

export const DISPUTE_STATUS = ["open", "investigating", "escalated", "resolved", "rejected"];
export const DISPUTE_TYPES = ["missing_package", "wrong_item", "damage_claim", "fraud_investigation", "other"];

export const SETTLEMENT_STATES = [
  "rider_collected",
  "branch_received",
  "platform_settled",
  "seller_paid",
  "flagged",
];

export const RULE_SCOPES = ["routing", "fraud", "cod_verification", "pricing"];
export const ZONE_TYPES = ["polygon", "radius", "restricted", "non_service"];

