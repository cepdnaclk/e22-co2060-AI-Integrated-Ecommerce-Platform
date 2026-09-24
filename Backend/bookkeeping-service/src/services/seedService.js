import { AccountModel } from "../models/Account.js";
import { AccountingRuleModel } from "../models/AccountingRule.js";
import {
  ACCOUNT_CODES,
  DEFAULT_CHART_OF_ACCOUNTS,
  ENTRY_SIDES,
  EVENT_TYPES
} from "../constants/accounting.js";

const rules = [
  {
    eventType: EVENT_TYPES.ORDER_CREATED,
    journalDescriptionTemplate: "Order {{payload.orderId}} created on credit terms",
    sourceDocumentType: "CUSTOMER_TAX_INVOICE",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, amountPath: "payload.amount" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.SALES_ONLINE, amountPath: "payload.amount" }
    ]
  },
  {
    eventType: EVENT_TYPES.ORDER_PAID,
    journalDescriptionTemplate: "Payment received for order {{payload.orderId}}",
    sourceDocumentType: "PAYMENT_GATEWAY_REPORT",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.BANK_OPERATING, amountPath: "payload.amount" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, amountPath: "payload.amount" }
    ]
  },
  {
    eventType: EVENT_TYPES.ORDER_SHIPPED,
    journalDescriptionTemplate: "COGS recognized for shipped order {{payload.orderId}}",
    sourceDocumentType: "DELIVERY_CONFIRMATION",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.COGS, amountPath: "payload.cogsAmount" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.INVENTORY, amountPath: "payload.cogsAmount" }
    ]
  },
  {
    eventType: EVENT_TYPES.PAYMENT_RECEIVED,
    journalDescriptionTemplate: "AR settlement for order {{payload.orderId}}",
    sourceDocumentType: "BANK_STATEMENT",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.BANK_OPERATING, amountPath: "payload.amount" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, amountPath: "payload.amount" }
    ]
  },
  {
    eventType: EVENT_TYPES.REFUND_ISSUED,
    journalDescriptionTemplate: "Refund issued for order {{payload.orderId}}",
    sourceDocumentType: "CREDIT_NOTE",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.SALES_RETURNS, amountPath: "payload.refundAmount" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.BANK_OPERATING, amountPath: "payload.refundAmount" }
    ]
  },
  {
    eventType: EVENT_TYPES.INVENTORY_PURCHASED,
    journalDescriptionTemplate: "Inventory purchased from supplier {{payload.supplierId}}",
    sourceDocumentType: "SUPPLIER_TAX_INVOICE",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.INVENTORY, amountPath: "payload.purchaseAmount" },
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.INVENTORY, amountPath: "payload.inwardFreight" },
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.INVENTORY, amountPath: "payload.importDuties" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, amountPath: "payload.totalPayable" }
    ]
  },
  {
    eventType: EVENT_TYPES.SUPPLIER_PAYMENT,
    journalDescriptionTemplate: "Supplier payment posted {{payload.reference}}",
    sourceDocumentType: "REMITTANCE_ADVICE",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, amountPath: "payload.supplierPaymentAmount" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.BANK_OPERATING, amountPath: "payload.supplierPaymentAmount" }
    ]
  },
  {
    eventType: EVENT_TYPES.MARKETPLACE_SETTLEMENT,
    journalDescriptionTemplate: "Marketplace seller settlement {{payload.settlementId}}",
    sourceDocumentType: "MARKETPLACE_SETTLEMENT_REPORT",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.GATEWAY_BALANCE, amountPath: "payload.marketplaceGross" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.SELLER_PAYABLES, amountPath: "payload.sellerPayable" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.MARKETPLACE_COMMISSION_REVENUE, amountPath: "payload.marketplaceFees" }
    ]
  },
  {
    eventType: EVENT_TYPES.MARKETPLACE_PAYMENT,
    journalDescriptionTemplate: "Marketplace payment for order {{payload.orderId}}",
    sourceDocumentType: "PAYHERE_CHECKOUT",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.GATEWAY_BALANCE, amountPath: "payload.marketplaceGross" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.SELLER_PAYABLES, amountPath: "payload.sellerPayableAmount" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.MARKETPLACE_COMMISSION_REVENUE, amountPath: "payload.commissionAmount" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.SHIPPING_REVENUE, amountPath: "payload.deliveryCharge" }
    ]
  },
  {
    eventType: EVENT_TYPES.GATEWAY_SETTLEMENT,
    journalDescriptionTemplate: "Gateway settlement to bank {{payload.settlementId}}",
    sourceDocumentType: "BANK_STATEMENT",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.BANK_OPERATING, amountPath: "payload.settledAmount" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.GATEWAY_BALANCE, amountPath: "payload.settledAmount" }
    ]
  },
  {
    eventType: EVENT_TYPES.SELLER_PAYOUT,
    journalDescriptionTemplate: "Payout to seller {{payload.sellerId}}",
    sourceDocumentType: "BANK_STATEMENT",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.SELLER_PAYABLES, amountPath: "payload.payoutAmount" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.BANK_OPERATING, amountPath: "payload.payoutAmount" }
    ]
  },
  {
    eventType: EVENT_TYPES.MARKETPLACE_REFUND,
    journalDescriptionTemplate: "Marketplace refund for order {{payload.orderId}}",
    sourceDocumentType: "CREDIT_NOTE",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.SELLER_PAYABLES, amountPath: "payload.sellerPayableAmount" },
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.MARKETPLACE_COMMISSION_REVENUE, amountPath: "payload.commissionAmount" },
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.SHIPPING_REVENUE, amountPath: "payload.deliveryCharge" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.GATEWAY_BALANCE, amountPath: "payload.refundGross" }
    ]
  },
  {
    eventType: EVENT_TYPES.EXPENSE_RECORDED,
    journalDescriptionTemplate: "Expense recorded {{payload.reference}}",
    sourceDocumentType: "RECEIPT",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: "{{payload.expenseAccountCode}}", amountPath: "payload.expenseAmount" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.BANK_OPERATING, amountPath: "payload.expenseAmount" }
    ]
  }
];

export const seedChartOfAccounts = async () => {
  for (const account of DEFAULT_CHART_OF_ACCOUNTS) {
    await AccountModel.updateOne(
      { code: account.code },
      { $set: account },
      { upsert: true }
    );
  }

  await AccountModel.deleteOne({ code: "6002" });
};

export const seedRules = async () => {
  for (const rule of rules) {
    await AccountingRuleModel.updateOne(
      { eventType: rule.eventType },
      { $set: rule },
      { upsert: true }
    );
  }
};

export const seedSystemData = async () => {
  await seedChartOfAccounts();
  await seedRules();
};






