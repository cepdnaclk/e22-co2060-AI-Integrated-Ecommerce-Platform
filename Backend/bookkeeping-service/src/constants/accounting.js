export const ACCOUNT_TYPES = Object.freeze({
  ASSET: "ASSET",
  LIABILITY: "LIABILITY",
  EQUITY: "EQUITY",
  REVENUE: "REVENUE",
  COST_OF_SALES: "COST_OF_SALES",
  EXPENSE: "EXPENSE",
  OTHER_INCOME: "OTHER_INCOME",
  OTHER_EXPENSE: "OTHER_EXPENSE"
});

export const ENTRY_SIDES = Object.freeze({
  DEBIT: "DEBIT",
  CREDIT: "CREDIT"
});

export const EVENT_TYPES = Object.freeze({
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_PAID: "ORDER_PAID",
  ORDER_SHIPPED: "ORDER_SHIPPED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  REFUND_ISSUED: "REFUND_ISSUED",
  INVENTORY_PURCHASED: "INVENTORY_PURCHASED",
  SUPPLIER_PAYMENT: "SUPPLIER_PAYMENT",
  MARKETPLACE_SETTLEMENT: "MARKETPLACE_SETTLEMENT",
  EXPENSE_RECORDED: "EXPENSE_RECORDED"
});

export const ACCOUNT_CODES = Object.freeze({
  CASH_ON_HAND: "1001",
  BANK_OPERATING: "1010",
  GATEWAY_BALANCE: "1015",
  ACCOUNTS_RECEIVABLE: "1100",
  MARKETPLACE_RECEIVABLES: "1110",
  INVENTORY: "1200",
  INPUT_TAX_RECOVERABLE: "1400",
  ACCOUNTS_PAYABLE: "2001",
  VAT_PAYABLE: "2100",
  UNEARNED_REVENUE: "2300",
  OWNER_CAPITAL: "3001",
  RETAINED_EARNINGS: "3100",
  SALES_ONLINE: "4001",
  SALES_MARKETPLACE: "4002",
  SALES_WHOLESALE: "4003",
  SHIPPING_REVENUE: "4010",
  SALES_RETURNS: "4900",
  COGS: "5001",
  MARKETPLACE_COMMISSION: "6002",
  PAYMENT_PROCESSING_FEES: "6003",
  CUSTOMER_REFUNDS_EXPENSE: "6070",
  ACCOUNTING_LEGAL_FEES: "6100"
});

export const DEFAULT_CHART_OF_ACCOUNTS = Object.freeze([
  { code: "1001", name: "Cash on Hand", type: ACCOUNT_TYPES.ASSET, normalBalance: ENTRY_SIDES.DEBIT },
  { code: "1010", name: "Bank Account - Operating", type: ACCOUNT_TYPES.ASSET, normalBalance: ENTRY_SIDES.DEBIT },
  { code: "1015", name: "PayPal / Stripe Balance", type: ACCOUNT_TYPES.ASSET, normalBalance: ENTRY_SIDES.DEBIT },
  { code: "1100", name: "Accounts Receivable", type: ACCOUNT_TYPES.ASSET, normalBalance: ENTRY_SIDES.DEBIT },
  { code: "1110", name: "Marketplace Receivables", type: ACCOUNT_TYPES.ASSET, normalBalance: ENTRY_SIDES.DEBIT },
  { code: "1200", name: "Inventory - Finished Goods", type: ACCOUNT_TYPES.ASSET, normalBalance: ENTRY_SIDES.DEBIT },
  { code: "1400", name: "Input Tax (VAT/GST) Recoverable", type: ACCOUNT_TYPES.ASSET, normalBalance: ENTRY_SIDES.DEBIT },
  { code: "2001", name: "Accounts Payable - Suppliers", type: ACCOUNT_TYPES.LIABILITY, normalBalance: ENTRY_SIDES.CREDIT },
  { code: "2100", name: "VAT / GST Payable", type: ACCOUNT_TYPES.LIABILITY, normalBalance: ENTRY_SIDES.CREDIT },
  { code: "2300", name: "Unearned Revenue (Gift Cards)", type: ACCOUNT_TYPES.LIABILITY, normalBalance: ENTRY_SIDES.CREDIT },
  { code: "3001", name: "Owner's Capital", type: ACCOUNT_TYPES.EQUITY, normalBalance: ENTRY_SIDES.CREDIT },
  { code: "3100", name: "Retained Earnings", type: ACCOUNT_TYPES.EQUITY, normalBalance: ENTRY_SIDES.CREDIT },
  { code: "4001", name: "Sales - Online Store", type: ACCOUNT_TYPES.REVENUE, normalBalance: ENTRY_SIDES.CREDIT },
  { code: "4002", name: "Sales - Marketplace", type: ACCOUNT_TYPES.REVENUE, normalBalance: ENTRY_SIDES.CREDIT },
  { code: "4003", name: "Sales - Wholesale / B2B", type: ACCOUNT_TYPES.REVENUE, normalBalance: ENTRY_SIDES.CREDIT },
  { code: "4010", name: "Shipping Revenue Recovered", type: ACCOUNT_TYPES.REVENUE, normalBalance: ENTRY_SIDES.CREDIT },
  { code: "4900", name: "Sales Returns & Allowances", type: ACCOUNT_TYPES.REVENUE, isContra: true, normalBalance: ENTRY_SIDES.DEBIT },
  { code: "5001", name: "Cost of Goods Sold", type: ACCOUNT_TYPES.COST_OF_SALES, normalBalance: ENTRY_SIDES.DEBIT },
  { code: "6002", name: "Marketplace Commission", type: ACCOUNT_TYPES.EXPENSE, normalBalance: ENTRY_SIDES.DEBIT },
  { code: "6003", name: "Payment Processing Fees", type: ACCOUNT_TYPES.EXPENSE, normalBalance: ENTRY_SIDES.DEBIT },
  { code: "6070", name: "Customer Refunds Expense", type: ACCOUNT_TYPES.EXPENSE, normalBalance: ENTRY_SIDES.DEBIT },
  { code: "6100", name: "Accounting & Legal Fees", type: ACCOUNT_TYPES.EXPENSE, normalBalance: ENTRY_SIDES.DEBIT }
]);

