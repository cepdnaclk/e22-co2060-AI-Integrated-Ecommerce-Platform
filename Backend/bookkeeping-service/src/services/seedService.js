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
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.SALES_ONLINE, amountPath: "payload.amount" }
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
    journalDescriptionTemplate: "Marketplace settlement {{payload.settlementId}}",
    sourceDocumentType: "MARKETPLACE_SETTLEMENT_REPORT",
    lines: [
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.BANK_OPERATING, amountPath: "payload.marketplaceNet" },
      { side: ENTRY_SIDES.DEBIT, accountCode: ACCOUNT_CODES.MARKETPLACE_COMMISSION, amountPath: "payload.marketplaceFees" },
      { side: ENTRY_SIDES.CREDIT, accountCode: ACCOUNT_CODES.SALES_MARKETPLACE, amountPath: "payload.marketplaceGross" }
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
    await AccountModel.updateOne({ code: account.code }, { $setOnInsert: account }, { upsert: true });
  }
};

export const seedRules = async () => {
  for (const rule of rules) {
    await AccountingRuleModel.updateOne(
      { eventType: rule.eventType },
      { $setOnInsert: rule },
      { upsert: true }
    );
  }
};

export const seedSystemData = async () => {
  await seedChartOfAccounts();
  await seedRules();
};

