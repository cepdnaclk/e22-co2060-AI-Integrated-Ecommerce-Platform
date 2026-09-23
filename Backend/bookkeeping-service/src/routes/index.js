import { Router } from "express";
import { postEvent } from "../controllers/eventController.js";
import {
  getBalanceSheetReport,
  getProfitLossReport,
  getTrialBalanceReport
} from "../controllers/reportController.js";
import { getLedgerByAccountId } from "../controllers/ledgerController.js";
import { getAccountsTerminal, searchAccounts } from "../controllers/accountController.js";
import {
  getManualJournal,
  postManualJournalEntry,
  reverseManualJournalEntry,
  upsertManualJournalDraft
} from "../controllers/manualJournalController.js";

export const apiRouter = Router();

apiRouter.post("/events", postEvent);
apiRouter.get("/reports/profit-loss", getProfitLossReport);
apiRouter.get("/reports/balance-sheet", getBalanceSheetReport);
apiRouter.get("/reports/trial-balance", getTrialBalanceReport);
apiRouter.get("/accounts/search", searchAccounts);
apiRouter.get("/accounts", getAccountsTerminal);
apiRouter.get("/ledger/:accountId", getLedgerByAccountId);
apiRouter.post("/manual-journal", upsertManualJournalDraft);
apiRouter.get("/manual-journal/:id", getManualJournal);
apiRouter.post("/manual-journal/post", postManualJournalEntry);
apiRouter.post("/manual-journal/reverse", reverseManualJournalEntry);

