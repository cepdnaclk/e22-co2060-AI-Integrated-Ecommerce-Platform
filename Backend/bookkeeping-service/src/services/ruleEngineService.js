import { AccountingRuleModel } from "../models/AccountingRule.js";
import { AccountModel } from "../models/Account.js";
import { ENTRY_SIDES } from "../constants/accounting.js";
import { toAmount } from "../utils/amount.js";
import { getPathValue, renderTemplate } from "../utils/template.js";

const resolveAccountCode = (accountCodeTemplate, event) => {
  if (accountCodeTemplate.includes("{{")) {
    return renderTemplate(accountCodeTemplate, event);
  }
  return accountCodeTemplate;
};

export const buildJournalDraftFromEvent = async (event) => {
  const rule = await AccountingRuleModel.findOne({ eventType: event.type, enabled: true }).lean();
  if (!rule) {
    throw new Error(`No enabled accounting rule found for event type ${event.type}`);
  }

  const lineDrafts = [];
  for (const templateLine of rule.lines) {
    const accountCode = resolveAccountCode(templateLine.accountCode, event);
    const amountValue = getPathValue(event, templateLine.amountPath);
    const amount = toAmount(amountValue, templateLine.amountPath);
    if (amount === 0) {
      continue;
    }

    const account = await AccountModel.findOne({ code: accountCode, active: true }).lean();
    if (!account) {
      throw new Error(`Account ${accountCode} is missing or inactive`);
    }

    lineDrafts.push({
      side: templateLine.side,
      accountCode,
      amount,
      narration: templateLine.descriptionTemplate
        ? renderTemplate(templateLine.descriptionTemplate, event)
        : `${templateLine.side} ${account.name}`
    });
  }

  if (lineDrafts.length < 2) {
    throw new Error(`Invalid rule output for event ${event.eventId}: at least two non-zero lines are required`);
  }

  const totalDebits = lineDrafts
    .filter((line) => line.side === ENTRY_SIDES.DEBIT)
    .reduce((sum, line) => sum + line.amount, 0);
  const totalCredits = lineDrafts
    .filter((line) => line.side === ENTRY_SIDES.CREDIT)
    .reduce((sum, line) => sum + line.amount, 0);

  if (toAmount(totalDebits) !== toAmount(totalCredits)) {
    throw new Error(
      `Unbalanced entry for event ${event.eventId}: debits=${toAmount(totalDebits)}, credits=${toAmount(totalCredits)}`
    );
  }

  const description = renderTemplate(rule.journalDescriptionTemplate, event);

  return {
    eventId: event.eventId,
    eventType: event.type,
    eventTimestamp: new Date(event.timestamp),
    sourceDocumentType: event.payload.sourceDocumentType ?? rule.sourceDocumentType,
    sourceDocumentId: event.payload.sourceDocumentId ?? event.payload.orderId ?? event.eventId,
    description,
    lines: lineDrafts,
    totalDebits: toAmount(totalDebits),
    totalCredits: toAmount(totalCredits)
  };
};

