const BOOKKEEPING_API_BASE_URL =
  import.meta.env.VITE_BOOKKEEPING_API_BASE_URL || "http://localhost:4020";

const parseError = async (response) => {
  try {
    const data = await response.json();
    return data?.message || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

const requestJson = async (path, options = {}) => {
  const headers = {
    ...(options.headers || {})
  };
  if (options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BOOKKEEPING_API_BASE_URL}${path}`, {
    headers,
    ...options
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
};

export const postBookkeepingEvent = (eventPayload) =>
  requestJson("/events", {
    method: "POST",
    body: JSON.stringify(eventPayload)
  });

export const fetchProfitLossReport = () => requestJson("/reports/profit-loss");

export const fetchBalanceSheetReport = () => requestJson("/reports/balance-sheet");

export const fetchTrialBalanceReport = () => requestJson("/reports/trial-balance");

export const fetchAccountsTerminal = (historyLimit = 12) =>
  requestJson(`/accounts?historyLimit=${encodeURIComponent(historyLimit)}`);

export const fetchLedgerByAccountCode = (accountCode) =>
  requestJson(`/ledger/${encodeURIComponent(accountCode)}`);

const toSearchParams = (params = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
};

export const searchChartAccounts = ({ query = "", type = "", limit = 20 } = {}) =>
  requestJson(`/accounts/search${toSearchParams({ query, type, limit })}`);

export const saveManualJournalDraft = (payload) =>
  requestJson("/manual-journal", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const fetchManualJournalById = (id) =>
  requestJson(`/manual-journal/${encodeURIComponent(id)}`);

export const postManualJournal = ({ transactionId }) =>
  requestJson("/manual-journal/post", {
    method: "POST",
    body: JSON.stringify({ transactionId })
  });

export const reverseManualJournal = ({ transactionId, reversalTransactionId, reversalDate, reason }) =>
  requestJson("/manual-journal/reverse", {
    method: "POST",
    body: JSON.stringify({ transactionId, reversalTransactionId, reversalDate, reason })
  });

