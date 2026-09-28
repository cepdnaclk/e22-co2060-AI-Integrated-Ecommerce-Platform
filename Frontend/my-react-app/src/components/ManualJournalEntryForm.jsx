import React, { useMemo, useState } from "react";
import AccountSearchSelect from "./AccountSearchSelect";
import {
  fetchManualJournalById,
  postManualJournal,
  reverseManualJournal,
  saveManualJournalDraft,
  searchChartAccounts
} from "../services/bookkeepingService";

const ACCOUNT_TYPE_FILTERS = [
  { label: "All", value: "" },
  { label: "Assets", value: "ASSET" },
  { label: "Liabilities", value: "LIABILITY" },
  { label: "Equity", value: "EQUITY" },
  { label: "Revenue", value: "REVENUE" },
  { label: "Expenses", value: "EXPENSE" }
];

const JOURNAL_TEMPLATES = [
  {
    key: "loan-payment",
    label: "Loan Payment",
    description: "Paying loan to supplier",
    lines: [{ debitAccountCode: "2001", creditAccountCode: "1010", amount: "0.00" }]
  },
  {
    key: "rent-payment",
    label: "Rent Payment",
    description: "Monthly rent payment",
    lines: [{ debitAccountCode: "6100", creditAccountCode: "1010", amount: "0.00" }]
  },
  {
    key: "inventory-purchase",
    label: "Inventory Purchase",
    description: "Inventory purchased manually",
    lines: [{ debitAccountCode: "1200", creditAccountCode: "2001", amount: "0.00" }]
  },
  {
    key: "salary-payment",
    label: "Salary Payment",
    description: "Salary payment recorded manually",
    lines: [{ debitAccountCode: "6100", creditAccountCode: "1010", amount: "0.00" }]
  }
];

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const createBlankLine = () => ({
  debitAccount: null,
  creditAccount: null,
  amount: ""
});

const createInitialForm = () => ({
  transactionId: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  referenceNo: "",
  lines: [createBlankLine()]
});

const toAccountDirectory = (accounts = []) =>
  accounts.reduce((map, account) => {
    map[account.code] = account;
    return map;
  }, {});

const buildLineFromCodes = (line, accountDirectory) => ({
  debitAccount: accountDirectory[line.debitAccountCode] ?? {
    code: line.debitAccountCode,
    name: "Account",
    type: "UNKNOWN"
  },
  creditAccount: accountDirectory[line.creditAccountCode] ?? {
    code: line.creditAccountCode,
    name: "Account",
    type: "UNKNOWN"
  },
  amount: Number(line.amount).toFixed(2)
});

export default function ManualJournalEntryForm() {
  const [form, setForm] = useState(createInitialForm());
  const [loadTransactionId, setLoadTransactionId] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [loadedJournal, setLoadedJournal] = useState(null);
  const [reverseReason, setReverseReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accountDirectory, setAccountDirectory] = useState({});

  const totals = useMemo(() => {
    const totalDebits = roundMoney(
      form.lines.reduce((sum, line) => {
        if (!line.debitAccount?.code) return sum;
        return sum + Number(line.amount || 0);
      }, 0)
    );
    const totalCredits = roundMoney(
      form.lines.reduce((sum, line) => {
        if (!line.creditAccount?.code) return sum;
        return sum + Number(line.amount || 0);
      }, 0)
    );
    return {
      totalDebits,
      totalCredits,
      balanced: totalDebits === totalCredits
    };
  }, [form.lines]);

  const hydrateFormFromJournal = async (manualJournal) => {
    const directory = await ensureAccountDirectory();
    setForm({
      transactionId: manualJournal.transactionId,
      description: manualJournal.description ?? "",
      date: manualJournal.date ? new Date(manualJournal.date).toISOString().slice(0, 10) : createInitialForm().date,
      referenceNo: manualJournal.referenceNo ?? "",
      lines: (manualJournal.lines ?? []).map((line) => buildLineFromCodes(line, directory))
    });
  };

  const ensureAccountDirectory = async () => {
    if (Object.keys(accountDirectory).length > 0) {
      return accountDirectory;
    }
    const response = await searchChartAccounts({ limit: 200 });
    const directory = toAccountDirectory(response.accounts ?? []);
    setAccountDirectory(directory);
    return directory;
  };

  const updateFormField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateLine = (index, patch) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line
      )
    }));
  };

  const addLine = () => {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, createBlankLine()]
    }));
  };

  const removeLine = (index) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.length === 1
        ? current.lines
        : current.lines.filter((_, lineIndex) => lineIndex !== index)
    }));
  };

  const validateForm = () => {
    if (!form.description.trim()) {
      return "Transaction description is required.";
    }
    if (!form.date) {
      return "Transaction date is required.";
    }
    if (!form.lines.length) {
      return "At least one journal line is required.";
    }

    for (let index = 0; index < form.lines.length; index += 1) {
      const line = form.lines[index];
      const amount = Number(line.amount);
      if (!line.debitAccount?.code) {
        return `Line ${index + 1}: debit account is required.`;
      }
      if (!line.creditAccount?.code) {
        return `Line ${index + 1}: credit account is required.`;
      }
      if (line.debitAccount.code === line.creditAccount.code) {
        return `Line ${index + 1}: debit and credit accounts cannot be the same.`;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return `Line ${index + 1}: amount must be greater than 0.`;
      }
    }

    if (!totals.balanced) {
      return "Total debits must equal total credits.";
    }

    return "";
  };

  const buildPayload = () => ({
    ...(form.transactionId ? { transactionId: form.transactionId } : {}),
    date: form.date,
    description: form.description.trim(),
    referenceNo: form.referenceNo.trim(),
    lines: form.lines.map((line) => ({
      debitAccountCode: line.debitAccount.code,
      creditAccountCode: line.creditAccount.code,
      amount: roundMoney(Number(line.amount))
    }))
  });

  const handleSaveDraft = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await saveManualJournalDraft(buildPayload());
      const manualJournal = response.manualJournal;
      setLoadedJournal(manualJournal);
      setLoadTransactionId(manualJournal.transactionId);
      await hydrateFormFromJournal(manualJournal);
      setSuccess(response.message || `Draft ${manualJournal.transactionId} saved.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAndPost = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const saved = await saveManualJournalDraft(buildPayload());
      const transactionId = saved.manualJournal.transactionId;
      const posted = await postManualJournal({ transactionId });
      setLoadedJournal(posted.manualJournal);
      setLoadTransactionId(transactionId);
      await hydrateFormFromJournal(posted.manualJournal);
      setSuccess(posted.message || `Manual journal ${transactionId} posted.`);
    } catch (postError) {
      setError(postError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoad = async () => {
    const id = loadTransactionId.trim();
    if (!id) {
      setError("Enter a transaction id to load.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetchManualJournalById(id);
      const manualJournal = response.manualJournal;
      setLoadedJournal(manualJournal);
      await hydrateFormFromJournal(manualJournal);
      setSuccess(`Loaded manual journal ${manualJournal.transactionId}.`);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReverse = async () => {
    if (!loadedJournal?.transactionId) {
      setError("Load a posted journal first.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await reverseManualJournal({
        transactionId: loadedJournal.transactionId,
        reason: reverseReason.trim() || undefined
      });
      setLoadedJournal(response.original);
      await hydrateFormFromJournal(response.original);
      setSuccess(
        `${response.message}. Reversal transaction: ${response.reversal?.transactionId || "created"}.`
      );
    } catch (reverseError) {
      setError(reverseError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleTemplateSelect = async (event) => {
    const nextTemplateKey = event.target.value;
    setTemplateKey(nextTemplateKey);
    if (!nextTemplateKey) return;

    const template = JOURNAL_TEMPLATES.find((item) => item.key === nextTemplateKey);
    if (!template) return;

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const directory = await ensureAccountDirectory();
      setForm((current) => ({
        ...current,
        description: template.description,
        lines: template.lines.map((line) => buildLineFromCodes(line, directory))
      }));
      setSuccess(`Template applied: ${template.label}`);
    } catch (templateError) {
      setError(templateError.message);
    } finally {
      setBusy(false);
    }
  };

  const createCorrectionDraft = async () => {
    if (!loadedJournal) {
      setError("Load a journal before creating a correction draft.");
      return;
    }
    try {
      const directory = await ensureAccountDirectory();
      setForm({
        transactionId: "",
        description: `Correction for ${loadedJournal.transactionId} - ${loadedJournal.description}`,
        date: new Date().toISOString().slice(0, 10),
        referenceNo: loadedJournal.referenceNo ? `${loadedJournal.referenceNo}-CORR` : "",
        lines: (loadedJournal.lines ?? []).map((line) => buildLineFromCodes(line, directory))
      });
      setLoadedJournal(null);
      setLoadTransactionId("");
      setSuccess("Correction draft created. Update lines and save.");
      setError("");
    } catch (correctionError) {
      setError(correctionError.message);
      setSuccess("");
    }
  };

  return (
    <div style={S.container}>
      <div style={S.headerGrid}>
        <div style={S.field}>
          <label style={S.label}>Transaction Description</label>
          <input
            value={form.description}
            onChange={(event) => updateFormField("description", event.target.value)}
            style={S.input}
            placeholder="Paying Loan to Supplier A"
            disabled={busy}
          />
        </div>
        <div style={S.field}>
          <label style={S.label}>Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(event) => updateFormField("date", event.target.value)}
            style={S.input}
            disabled={busy}
          />
        </div>
        <div style={S.field}>
          <label style={S.label}>Reference No</label>
          <input
            value={form.referenceNo}
            onChange={(event) => updateFormField("referenceNo", event.target.value)}
            style={S.input}
            placeholder="Auto or manual reference"
            disabled={busy}
          />
        </div>
      </div>

      <div style={S.headerGrid}>
        <div style={S.field}>
          <label style={S.label}>Template</label>
          <select
            value={templateKey}
            onChange={handleTemplateSelect}
            style={S.input}
            disabled={busy}
          >
            <option value="">Select template</option>
            {JOURNAL_TEMPLATES.map((template) => (
              <option key={template.key} value={template.key}>
                {template.label}
              </option>
            ))}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.label}>Account Filter</label>
          <select
            value={accountTypeFilter}
            onChange={(event) => setAccountTypeFilter(event.target.value)}
            style={S.input}
            disabled={busy}
          >
            {ACCOUNT_TYPE_FILTERS.map((filter) => (
              <option key={filter.value || "all"} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.label}>Transaction ID</label>
          <input value={form.transactionId || "(Auto on save)"} style={S.readonlyInput} readOnly />
        </div>
      </div>

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.tableHead}>Debit Account</th>
              <th style={S.tableHead}>Credit Account</th>
              <th style={S.tableHead}>Amount</th>
              <th style={S.tableHead}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {form.lines.map((line, index) => (
              <tr key={`line-${index}`}>
                <td style={S.tableCell}>
                  <AccountSearchSelect
                    selectedAccount={line.debitAccount}
                    onSelect={(account) => updateLine(index, { debitAccount: account })}
                    typeFilter={accountTypeFilter}
                    disabled={busy}
                  />
                </td>
                <td style={S.tableCell}>
                  <AccountSearchSelect
                    selectedAccount={line.creditAccount}
                    onSelect={(account) => updateLine(index, { creditAccount: account })}
                    typeFilter={accountTypeFilter}
                    disabled={busy}
                  />
                </td>
                <td style={S.tableCell}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.amount}
                    onChange={(event) => updateLine(index, { amount: event.target.value })}
                    style={S.amountInput}
                    placeholder="1000.00"
                    disabled={busy}
                  />
                </td>
                <td style={S.tableCellActions}>
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    style={S.lineActionButton}
                    disabled={busy || form.lines.length === 1}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={S.row}>
        <button type="button" onClick={addLine} style={S.secondaryButton} disabled={busy}>
          + Add Another Line
        </button>
        <div style={S.totals}>
          <span>Total Debits: {totals.totalDebits.toFixed(2)}</span>
          <span>Total Credits: {totals.totalCredits.toFixed(2)}</span>
          <span style={{ color: totals.balanced ? "#86efac" : "#fda4af" }}>
            {totals.balanced ? "Balanced" : "Unbalanced"}
          </span>
        </div>
      </div>

      <div style={S.row}>
        <button type="button" style={S.primaryButton} onClick={handleSaveDraft} disabled={busy}>
          {busy ? "Working..." : "Save Draft"}
        </button>
        <button type="button" style={S.primaryButton} onClick={handleSaveAndPost} disabled={busy}>
          {busy ? "Working..." : "Save & Post"}
        </button>
      </div>

      <div style={S.loadRow}>
        <input
          value={loadTransactionId}
          onChange={(event) => setLoadTransactionId(event.target.value)}
          placeholder="Load draft/posted journal by transaction ID"
          style={S.input}
          disabled={busy}
        />
        <button type="button" style={S.secondaryButton} onClick={handleLoad} disabled={busy}>
          Load Journal
        </button>
      </div>

      {loadedJournal ? (
        <div style={S.statusPanel}>
          <div style={S.statusRow}>
            <strong>Loaded:</strong> {loadedJournal.transactionId}
            <span style={S.statusBadge}>{loadedJournal.status}</span>
          </div>
          <div style={S.statusActions}>
            <input
              value={reverseReason}
              onChange={(event) => setReverseReason(event.target.value)}
              style={S.input}
              placeholder="Reverse reason (optional)"
              disabled={busy || loadedJournal.status !== "POSTED"}
            />
            <button
              type="button"
              style={S.secondaryButton}
              onClick={handleReverse}
              disabled={busy || loadedJournal.status !== "POSTED"}
            >
              Reverse Posted Journal
            </button>
            <button type="button" style={S.secondaryButton} onClick={createCorrectionDraft} disabled={busy}>
              Create Correction Draft
            </button>
          </div>
        </div>
      ) : null}

      {error ? <div style={S.error}>{error}</div> : null}
      {success ? <div style={S.success}>{success}</div> : null}
    </div>
  );
}

const S = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  headerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px"
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "12px",
    color: "#cbd5e1",
    fontWeight: 600
  },
  input: {
    borderRadius: "8px",
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(2, 6, 23, 0.7)",
    color: "#e2e8f0",
    padding: "10px 12px",
    fontSize: "13px"
  },
  readonlyInput: {
    borderRadius: "8px",
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(15, 23, 42, 0.75)",
    color: "#94a3b8",
    padding: "10px 12px",
    fontSize: "13px"
  },
  tableWrap: {
    border: "1px solid rgba(148,163,184,0.25)",
    borderRadius: "12px",
    overflow: "auto",
    height: "320px"
  },
  table: {
    width: "100%",
    minWidth: "900px",
    borderCollapse: "collapse"
  },
  tableHead: {
    textAlign: "left",
    fontSize: "12px",
    color: "#cbd5e1",
    background: "rgba(30, 41, 59, 0.8)",
    borderBottom: "1px solid rgba(148,163,184,0.25)",
    padding: "10px",
    position: "sticky",
    top: 0,
    zIndex: 1
  },
  tableCell: {
    verticalAlign: "top",
    padding: "10px",
    borderBottom: "1px solid rgba(148,163,184,0.15)"
  },
  tableCellActions: {
    padding: "10px",
    borderBottom: "1px solid rgba(148,163,184,0.15)",
    textAlign: "center",
    verticalAlign: "top"
  },
  amountInput: {
    width: "140px",
    borderRadius: "8px",
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(2, 6, 23, 0.7)",
    color: "#e2e8f0",
    padding: "10px",
    fontSize: "13px"
  },
  lineActionButton: {
    border: "1px solid rgba(248,113,113,0.35)",
    borderRadius: "8px",
    background: "rgba(127,29,29,0.28)",
    color: "#fecaca",
    padding: "8px 10px",
    fontSize: "12px"
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap"
  },
  loadRow: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap"
  },
  totals: {
    display: "flex",
    gap: "14px",
    fontSize: "13px",
    color: "#cbd5e1",
    flexWrap: "wrap"
  },
  primaryButton: {
    border: "none",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #9333ea, #a855f7)",
    color: "#fff",
    padding: "10px 16px",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer"
  },
  secondaryButton: {
    border: "1px solid rgba(148,163,184,0.35)",
    borderRadius: "10px",
    background: "rgba(15,23,42,0.65)",
    color: "#e2e8f0",
    padding: "10px 14px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer"
  },
  statusPanel: {
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(15,23,42,0.5)",
    borderRadius: "10px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#e2e8f0",
    fontSize: "13px",
    flexWrap: "wrap"
  },
  statusBadge: {
    border: "1px solid rgba(147,197,253,0.45)",
    borderRadius: "999px",
    padding: "3px 10px",
    color: "#dbeafe",
    fontSize: "11px",
    fontWeight: 700
  },
  statusActions: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) auto auto",
    gap: "10px",
    alignItems: "center"
  },
  error: {
    border: "1px solid rgba(248,113,113,0.45)",
    background: "rgba(127,29,29,0.35)",
    color: "#fecaca",
    padding: "10px 12px",
    borderRadius: "10px",
    fontSize: "13px"
  },
  success: {
    border: "1px solid rgba(52,211,153,0.45)",
    background: "rgba(6,78,59,0.35)",
    color: "#a7f3d0",
    padding: "10px 12px",
    borderRadius: "10px",
    fontSize: "13px"
  }
};

