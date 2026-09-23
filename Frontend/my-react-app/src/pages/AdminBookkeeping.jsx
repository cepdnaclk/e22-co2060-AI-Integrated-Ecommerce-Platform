import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchAccountsTerminal,
  fetchBalanceSheetReport,
  fetchLedgerByAccountCode,
  fetchProfitLossReport,
  fetchTrialBalanceReport,
  postBookkeepingEvent
} from "../services/bookkeepingService";
import ManualJournalEntryForm from "../components/ManualJournalEntryForm";

const DEFAULT_EVENT = {
  eventId: `evt-${Date.now()}`,
  type: "ORDER_PAID",
  timestamp: new Date().toISOString(),
  source: "admin-panel",
  payload: {
    orderId: "1001",
    amount: 3500,
    sourceDocumentType: "PAYMENT_GATEWAY_REPORT",
    sourceDocumentId: "PG-1001"
  }
};

export default function AdminBookkeeping() {
  const navigate = useNavigate();
  const [eventText, setEventText] = useState(JSON.stringify(DEFAULT_EVENT, null, 2));
  const [eventResult, setEventResult] = useState(null);
  const [eventError, setEventError] = useState("");
  const [reportError, setReportError] = useState("");
  const [ledgerError, setLedgerError] = useState("");
  const [accountsError, setAccountsError] = useState("");
  const [profitLoss, setProfitLoss] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [trialBalance, setTrialBalance] = useState(null);
  const [accountsTerminal, setAccountsTerminal] = useState(null);
  const [ledgerAccountCode, setLedgerAccountCode] = useState("1010");
  const [ledger, setLedger] = useState(null);
  const [busy, setBusy] = useState(false);

  const trialBalanceLines = useMemo(() => trialBalance?.lines ?? [], [trialBalance]);
  const ledgerHistory = useMemo(() => {
    if (!ledger?.ledger?.history) return [];
    return [...ledger.ledger.history].reverse();
  }, [ledger]);

  const handleExportTrialBalance = () => {
    if (!trialBalanceLines.length) return;
    downloadCsv(
      `trial-balance-${toFileTimestamp()}.csv`,
      ["accountCode", "accountName", "normalBalance", "debit", "credit", "balance"],
      trialBalanceLines.map((line) => ({
        accountCode: line.accountCode,
        accountName: line.accountName,
        normalBalance: line.normalBalance,
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
        balance: Number(line.balance || 0)
      }))
    );
  };

  const handleExportLedger = () => {
    if (!ledger || !ledgerHistory.length) return;
    downloadCsv(
      `ledger-${ledger.account?.code || "account"}-${toFileTimestamp()}.csv`,
      ["accountCode", "accountName", "postedAt", "eventType", "eventId", "debit", "credit", "balanceAfter"],
      ledgerHistory.map((entry) => ({
        accountCode: ledger.account?.code || ledger.ledger?.accountCode || "",
        accountName: ledger.account?.name || "",
        postedAt: entry.postedAt || "",
        eventType: entry.eventType || "",
        eventId: entry.eventId || "",
        debit: Number(entry.debit || 0),
        credit: Number(entry.credit || 0),
        balanceAfter: Number(entry.balanceAfter || 0)
      }))
    );
  };

  const handleExportAccountType = (type, accounts) => {
    if (!accounts?.length) return;
    downloadCsv(
      `accounts-${String(type).toLowerCase()}-${toFileTimestamp()}.csv`,
      ["type", "accountCode", "accountName", "normalBalance", "isContra", "debitTotal", "creditTotal", "balance", "historyRows"],
      accounts.map((account) => ({
        type,
        accountCode: account.code,
        accountName: account.name,
        normalBalance: account.normalBalance,
        isContra: Boolean(account.isContra),
        debitTotal: Number(account.debitTotal || 0),
        creditTotal: Number(account.creditTotal || 0),
        balance: Number(account.balance || 0),
        historyRows: Array.isArray(account.history) ? account.history.length : 0
      }))
    );
  };

  const handleExportTAccount = (account) => {
    if (!account?.history?.length) return;
    downloadCsv(
      `t-account-${account.code}-${toFileTimestamp()}.csv`,
      ["accountCode", "accountName", "normalBalance", "postedAt", "eventType", "eventId", "debit", "credit", "balanceAfter"],
      account.history.map((entry) => ({
        accountCode: account.code,
        accountName: account.name,
        normalBalance: account.normalBalance,
        postedAt: entry.postedAt || "",
        eventType: entry.eventType || "",
        eventId: entry.eventId || "",
        debit: Number(entry.debit || 0),
        credit: Number(entry.credit || 0),
        balanceAfter: Number(entry.balanceAfter || 0)
      }))
    );
  };

  const handlePostEvent = async () => {
    setEventError("");
    setEventResult(null);
    try {
      const parsed = JSON.parse(eventText);
      setBusy(true);
      const result = await postBookkeepingEvent(parsed);
      setEventResult(result);
    } catch (error) {
      setEventError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadReports = async () => {
    setReportError("");
    try {
      setBusy(true);
      const [pl, bs, tb] = await Promise.all([
        fetchProfitLossReport(),
        fetchBalanceSheetReport(),
        fetchTrialBalanceReport()
      ]);
      setProfitLoss(pl);
      setBalanceSheet(bs);
      setTrialBalance(tb);
    } catch (error) {
      setReportError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadLedger = async () => {
    setLedgerError("");
    try {
      setBusy(true);
      const data = await fetchLedgerByAccountCode(ledgerAccountCode.trim());
      setLedger(data);
    } catch (error) {
      setLedgerError(error.message);
      setLedger(null);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadAccountsTerminal = async () => {
    setAccountsError("");
    try {
      setBusy(true);
      const data = await fetchAccountsTerminal(16);
      setAccountsTerminal(data);
    } catch (error) {
      setAccountsError(error.message);
      setAccountsTerminal(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.page}>
      <style>{`
        .bk-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .bk-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.45); border-radius: 999px; }
        .bk-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(168, 85, 247, 0.75), rgba(59, 130, 246, 0.75)); border-radius: 999px; }
        .bk-table tbody tr:nth-child(even) { background: rgba(148, 163, 184, 0.05); }
        .bk-table tbody tr:hover { background: rgba(168, 85, 247, 0.12); }
      `}</style>
      <div style={S.container}>
        <div style={S.headerRow}>
          <div>
            <h1 style={S.title}>Bookkeeping Administration</h1>
            <p style={S.subTitle}>Real-time accounting controls for event ingestion, journals, ledgers, and reporting.</p>
          </div>
          <button onClick={() => navigate("/admin/dashboard")} style={S.secondaryButton}>
            Back to Dashboard
          </button>
        </div>

        <section style={{ ...S.card, marginBottom: 16 }}>
          <h2 style={S.cardTitle}>Manual Journal Entry</h2>
          <p style={S.note}>Manual double-entry form with draft/post/reverse support.</p>
          <ManualJournalEntryForm />
        </section>

        <div style={S.grid}>
          <section style={S.card}>
            <h2 style={S.cardTitle}>Post Event</h2>
            <p style={S.note}>Send bookkeeping event payload to the bookkeeping microservice queue.</p>
            <textarea
              style={S.textArea}
              value={eventText}
              onChange={(e) => setEventText(e.target.value)}
              spellCheck={false}
            />
            <button style={S.primaryButton} onClick={handlePostEvent} disabled={busy}>
              {busy ? "Submitting..." : "POST /events"}
            </button>
            {eventError ? <p style={S.errorText}>{eventError}</p> : null}
            {eventResult ? <pre style={S.resultBox}>{JSON.stringify(eventResult, null, 2)}</pre> : null}
          </section>

          <section style={S.card}>
            <h2 style={S.cardTitle}>Financial Reports</h2>
            <p style={S.note}>Fetch P&L, Balance Sheet, and Trial Balance from bookkeeping service.</p>
            <button style={S.primaryButton} onClick={handleLoadReports} disabled={busy}>
              {busy ? "Loading..." : "Load Reports"}
            </button>
            {reportError ? <p style={S.errorText}>{reportError}</p> : null}

            {profitLoss ? (
              <div style={S.metricGrid}>
                <Metric label="Revenue" value={profitLoss.revenue} />
                <Metric label="COGS" value={profitLoss.costOfGoodsSold} />
                <Metric label="Gross Profit" value={profitLoss.grossProfit} />
                <Metric label="Operating Expenses" value={profitLoss.operatingExpenses} />
                <Metric label="Net Profit" value={profitLoss.netProfit} />
              </div>
            ) : null}

            {balanceSheet ? (
              <div style={{ marginTop: 14 }}>
                <h3 style={S.smallTitle}>Balance Sheet</h3>
                <div style={S.metricGrid}>
                  <Metric label="Assets" value={balanceSheet.assets} />
                  <Metric label="Liabilities" value={balanceSheet.liabilities} />
                  <Metric label="Equity" value={balanceSheet.equity} />
                  <Metric label="Liabilities + Equity" value={balanceSheet.liabilitiesAndEquity} />
                </div>
              </div>
            ) : null}

            {trialBalance?.totals ? (
              <div style={{ marginTop: 14 }}>
                <div style={S.sectionHeaderRow}>
                  <h3 style={S.smallTitle}>Trial Balance Totals</h3>
                  <button
                    type="button"
                    style={{ ...S.exportButtonTiny, opacity: trialBalanceLines.length ? 1 : 0.45 }}
                    onClick={handleExportTrialBalance}
                    disabled={!trialBalanceLines.length}
                  >
                    CSV
                  </button>
                </div>
                <div style={S.metricGrid}>
                  <Metric label="Total Debits" value={trialBalance.totals.totalDebits} />
                  <Metric label="Total Credits" value={trialBalance.totals.totalCredits} />
                </div>
                <div style={S.tableWrap} className="bk-scrollbar">
                  <table style={S.table} className="bk-table">
                    <thead>
                      <tr>
                        <th style={S.tableHeadCell}>Account</th>
                        <th style={S.tableHeadCell}>Name</th>
                        <th style={S.tableHeadCellRight}>Debit</th>
                        <th style={S.tableHeadCellRight}>Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialBalanceLines.length > 0 ? (
                        trialBalanceLines.map((line) => (
                          <tr key={line.accountCode}>
                            <td style={S.tableCodeCell}>{line.accountCode}</td>
                            <td style={S.tableCell}>{line.accountName}</td>
                            <td style={S.tableCellRight}>{formatMoney(line.debit)}</td>
                            <td style={S.tableCellRight}>{formatMoney(line.credit)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={S.tableEmptyCell}>No trial balance rows available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>

          <section style={S.card}>
            <h2 style={S.cardTitle}>Ledger Lookup</h2>
            <p style={S.note}>Inspect ledger movement and running balance by account code.</p>
            <div style={S.inputRow}>
              <input
                style={S.input}
                value={ledgerAccountCode}
                onChange={(e) => setLedgerAccountCode(e.target.value)}
                placeholder="Enter account code (e.g., 1010)"
              />
              <button style={S.primaryButton} onClick={handleLoadLedger} disabled={busy}>Load</button>
            </div>
            {ledgerError ? <p style={S.errorText}>{ledgerError}</p> : null}
            {ledger ? (
              <div style={S.ledgerPanel}>
                <div style={S.sectionHeaderRow}>
                  <h3 style={S.smallTitle}>{ledger.account?.code} - {ledger.account?.name}</h3>
                  <button
                    type="button"
                    style={{ ...S.exportButtonTiny, opacity: ledgerHistory.length ? 1 : 0.45 }}
                    onClick={handleExportLedger}
                    disabled={!ledgerHistory.length}
                  >
                    CSV
                  </button>
                </div>
                <p style={S.note}>Type: {ledger.account?.type} {ledger.account?.isContra ? "| Contra account" : ""}</p>
                <div style={S.metricGrid}>
                  <Metric label="Balance" value={ledger.ledger?.balance} />
                  <Metric label="Debit Total" value={ledger.ledger?.debitTotal} />
                  <Metric label="Credit Total" value={ledger.ledger?.creditTotal} />
                </div>

                <div style={S.tableWrap} className="bk-scrollbar">
                  <table style={S.table} className="bk-table">
                    <thead>
                      <tr>
                        <th style={S.tableHeadCell}>Date</th>
                        <th style={S.tableHeadCell}>Event Type</th>
                        <th style={S.tableHeadCell}>Event ID</th>
                        <th style={S.tableHeadCellRight}>Debit</th>
                        <th style={S.tableHeadCellRight}>Credit</th>
                        <th style={S.tableHeadCellRight}>Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerHistory.length > 0 ? (
                        ledgerHistory.map((entry, index) => (
                          <tr key={`${entry.eventId || entry.postedAt || index}-${index}`}>
                            <td style={S.tableCell}>{formatDateTime(entry.postedAt)}</td>
                            <td style={S.tableCell}>{entry.eventType || "-"}</td>
                            <td style={S.tableCodeCell}>{entry.eventId || "-"}</td>
                            <td style={S.tableCellRight}>{formatMoney(entry.debit)}</td>
                            <td style={S.tableCellRight}>{formatMoney(entry.credit)}</td>
                            <td style={S.tableCellRight}>{formatMoney(entry.balanceAfter)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} style={S.tableEmptyCell}>No ledger movements available for this account.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>

          <section style={{ ...S.card, gridColumn: "1 / -1" }}>
            <h2 style={S.cardTitle}>Accounts Terminal</h2>
            <p style={S.note}>Account types with all accounts listed under each type, rendered as T-accounts.</p>
            <button style={S.primaryButton} onClick={handleLoadAccountsTerminal} disabled={busy}>
              {busy ? "Loading..." : "Load Accounts Terminal"}
            </button>
            {accountsError ? <p style={S.errorText}>{accountsError}</p> : null}

            {accountsTerminal?.accountTypes ? (
              <div style={S.typeContainer}>
                {Object.entries(accountsTerminal.accountTypes).map(([type, accounts]) => (
                  <div key={type} style={S.typeSection}>
                    <div style={S.typeHeaderRow}>
                      <h3 style={S.typeTitle}>{type} ({accounts.length})</h3>
                      <button
                        type="button"
                        style={{ ...S.exportButtonTiny, opacity: accounts.length ? 1 : 0.45 }}
                        onClick={() => handleExportAccountType(type, accounts)}
                        disabled={!accounts.length}
                      >
                        CSV
                      </button>
                    </div>
                    {accounts.length === 0 ? (
                      <p style={S.note}>No accounts in this type.</p>
                    ) : (
                      <div style={S.accountsGrid}>
                        {accounts.map((account) => (
                          <TAccountView key={account.code} account={account} onExport={handleExportTAccount} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={S.metricCard}>
      <div style={S.metricLabel}>{label}</div>
      <div style={S.metricValue}>{formatMoney(value)}</div>
    </div>
  );
}

function TAccountView({ account, onExport }) {
  const debitRows = account.history.filter((entry) => Number(entry.debit) > 0);
  const creditRows = account.history.filter((entry) => Number(entry.credit) > 0);

  return (
    <article style={S.tAccountCard}>
      <header style={S.tAccountHeader}>
        <div style={S.tAccountTitle}>
          <strong>{account.code} - {account.name}</strong>
        </div>
        <div style={S.tAccountHeaderActions}>
          <div style={S.tAccountTypeBadge}>
            {account.normalBalance}{account.isContra ? " (Contra)" : ""}
          </div>
          <button
            type="button"
            style={{ ...S.exportButtonMini, opacity: account.history?.length ? 1 : 0.45 }}
            onClick={() => onExport(account)}
            disabled={!account.history?.length}
          >
            CSV
          </button>
        </div>
      </header>

      <div style={S.tAccountBody}>
        <div style={S.tHeadRow}>
          <div style={S.tHeadLeft}>Debit (Dr)</div>
          <div style={S.tHeadRight}>Credit (Cr)</div>
        </div>

        <div style={S.tDataContainer}>
          <div style={S.tColumnLeft}>
            {debitRows.length > 0 ? (
              debitRows.map((debit, idx) => (
                <div key={`dr-${idx}`} style={S.tRowEntry}>
                  <span style={S.tDate}>{formatShortDate(debit.postedAt)}</span>
                  <span style={S.tAmount}>{formatMoney(debit.debit)}</span>
                </div>
              ))
            ) : <div style={{ height: "20px" }}></div>}
          </div>
          <div style={S.tColumnRight}>
            {creditRows.length > 0 ? (
              creditRows.map((credit, idx) => (
                <div key={`cr-${idx}`} style={S.tRowEntry}>
                  <span style={S.tDate}>{formatShortDate(credit.postedAt)}</span>
                  <span style={S.tAmount}>{formatMoney(credit.credit)}</span>
                </div>
              ))
            ) : <div style={{ height: "20px" }}></div>}
          </div>
        </div>

        <div style={S.tTotalsRow}>
          <div style={S.tTotalLeft}>{formatMoney(account.debitTotal)}</div>
          <div style={S.tTotalRight}>{formatMoney(account.creditTotal)}</div>
        </div>
      </div>
    </article>
  );
}

const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));

const formatShortDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const toFileTimestamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
};

const downloadCsv = (filename, headers, rows) => {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(","))
  ];
  const csvContent = lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const S = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #312e81, #0f172a 45%, #020617)",
    color: "#fff",
    padding: "36px 24px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif"
  },
  container: {
    maxWidth: "1280px",
    margin: "0 auto"
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "1px solid rgba(255,255,255,0.1)"
  },
  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 800
  },
  subTitle: {
    margin: "8px 0 0 0",
    color: "#cbd5e1",
    fontSize: "15px",
    maxWidth: "700px",
    lineHeight: "1.5"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "24px"
  },
  card: {
    background: "linear-gradient(160deg, rgba(30, 41, 59, 0.62), rgba(15, 23, 42, 0.72))",
    border: "1px solid rgba(148,163,184,0.2)",
    borderRadius: "18px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  cardTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 700
  },
  note: {
    margin: 0,
    color: "#b7c4d8",
    fontSize: "14px",
    lineHeight: "1.5"
  },
  textArea: {
    width: "100%",
    minHeight: "220px",
    resize: "vertical",
    borderRadius: "12px",
    border: "1px solid rgba(148,163,184,0.3)",
    background: "rgba(2, 6, 23, 0.7)",
    color: "#e2e8f0",
    fontSize: "13px",
    lineHeight: 1.5,
    padding: "12px",
    fontFamily: "'Courier New', Courier, monospace"
  },
  inputRow: {
    display: "flex",
    gap: "12px",
    marginTop: "8px"
  },
  input: {
    flex: 1,
    borderRadius: "10px",
    border: "1px solid rgba(148,163,184,0.3)",
    background: "rgba(2, 6, 23, 0.7)",
    color: "#e2e8f0",
    padding: "10px 14px",
    fontSize: "14px"
  },
  primaryButton: {
    background: "linear-gradient(135deg, #9333ea, #a855f7)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    alignSelf: "flex-start"
  },
  secondaryButton: {
    background: "rgba(255,255,255,0.05)",
    color: "#cbd5e1",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer"
  },
  errorText: {
    color: "#f87171",
    margin: "4px 0 0 0",
    fontSize: "13px"
  },
  resultBox: {
    marginTop: "12px",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(2,6,23,0.72)",
    color: "#cbd5e1",
    fontSize: "12px",
    maxHeight: "300px",
    overflow: "auto",
    padding: "14px",
    fontFamily: "'Courier New', Courier, monospace"
  },
  metricGrid: {
    marginTop: "16px",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(130px, 1fr))",
    gap: "12px"
  },
  metricCard: {
    background: "linear-gradient(145deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))",
    borderRadius: "12px",
    border: "1px solid rgba(148,163,184,0.2)",
    padding: "14px"
  },
  metricLabel: {
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase"
  },
  metricValue: {
    marginTop: "6px",
    fontWeight: 800,
    fontSize: "18px"
  },
  smallTitle: {
    margin: 0,
    fontSize: "15px",
    color: "#e2e8f0",
    fontWeight: 700
  },
  sectionHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginTop: "18px",
    marginBottom: "8px"
  },
  ledgerPanel: { marginTop: "8px" },
  tableWrap: {
    marginTop: "12px",
    border: "1px solid rgba(148,163,184,0.2)",
    borderRadius: "12px",
    overflow: "auto",
    background: "rgba(2,6,23,0.55)",
    height: "320px"
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    minWidth: "640px"
  },
  tableHeadCell: {
    textAlign: "left",
    padding: "11px 12px",
    fontSize: "12px",
    textTransform: "uppercase",
    color: "#cbd5e1",
    background: "rgba(30,41,59,0.95)",
    borderBottom: "1px solid rgba(148,163,184,0.3)",
    position: "sticky",
    top: 0,
    zIndex: 1
  },
  tableHeadCellRight: {
    textAlign: "right",
    padding: "11px 12px",
    fontSize: "12px",
    textTransform: "uppercase",
    color: "#cbd5e1",
    background: "rgba(30,41,59,0.95)",
    borderBottom: "1px solid rgba(148,163,184,0.3)",
    position: "sticky",
    top: 0,
    zIndex: 1
  },
  tableCell: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(148,163,184,0.15)",
    fontSize: "13px",
    color: "#e2e8f0"
  },
  tableCodeCell: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(148,163,184,0.15)",
    fontSize: "12px",
    color: "#e2e8f0",
    fontFamily: "'Courier New', Courier, monospace"
  },
  tableCellRight: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(148,163,184,0.15)",
    fontSize: "13px",
    color: "#e2e8f0",
    textAlign: "right",
    whiteSpace: "nowrap"
  },
  tableEmptyCell: { padding: "14px 12px", fontSize: "13px", color: "#94a3b8" },
  typeContainer: { marginTop: "20px", display: "grid", gap: "24px" },
  typeSection: {
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "16px",
    padding: "20px",
    background: "rgba(15,23,42,0.3)"
  },
  typeHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    paddingBottom: "8px",
    marginBottom: "16px"
  },
  typeTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#e2e8f0"
  },
  accountsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px"
  },
  tAccountCard: {
    border: "1px solid rgba(148,163,184,0.25)",
    borderRadius: "14px",
    background: "linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.85) 100%)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    height: "360px"
  },
  tAccountHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(148,163,184,0.45)"
  },
  tAccountHeaderActions: { display: "flex", alignItems: "center", gap: "8px" },
  tAccountTitle: { fontSize: "14px", color: "#f8fafc", fontWeight: "bold" },
  tAccountTypeBadge: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    background: "rgba(0,0,0,0.2)",
    padding: "3px 8px",
    borderRadius: "12px"
  },
  tAccountBody: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 },
  tHeadRow: {
    display: "flex",
    borderBottom: "1px solid rgba(148,163,184,0.2)",
    paddingBottom: "4px",
    marginBottom: "6px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#94a3b8",
    textAlign: "center"
  },
  tHeadLeft: { flex: 1, borderRight: "1px solid rgba(148,163,184,0.45)" },
  tHeadRight: { flex: 1 },
  tDataContainer: { display: "flex", flex: 1, minHeight: 0, overflow: "hidden" },
  tColumnLeft: {
    flex: 1,
    borderRight: "1px solid rgba(148,163,184,0.45)",
    paddingRight: "8px",
    overflowY: "auto",
    minHeight: 0
  },
  tColumnRight: { flex: 1, paddingLeft: "8px", overflowY: "auto", minHeight: 0 },
  tRowEntry: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    color: "#e2e8f0",
    padding: "4px 6px",
    borderRadius: "6px",
    borderBottom: "1px dashed rgba(255,255,255,0.08)",
    background: "rgba(15,23,42,0.35)"
  },
  tDate: { color: "#64748b", fontSize: "11px" },
  tAmount: { fontWeight: "500", fontFamily: "'Courier New', Courier, monospace" },
  tTotalsRow: {
    display: "flex",
    marginTop: "8px",
    paddingTop: "6px",
    borderTop: "1px solid rgba(148,163,184,0.5)",
    fontSize: "13px",
    fontWeight: "700",
    color: "#cbd5e1"
  },
  tTotalLeft: { flex: 1, textAlign: "right", paddingRight: "8px", borderRight: "1px solid rgba(148,163,184,0.45)" },
  tTotalRight: { flex: 1, textAlign: "right", paddingRight: "4px" },
  exportButtonTiny: {
    border: "1px solid rgba(59,130,246,0.4)",
    background: "rgba(59,130,246,0.14)",
    color: "#bfdbfe",
    borderRadius: "8px",
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 700
  },
  exportButtonMini: {
    border: "1px solid rgba(59,130,246,0.35)",
    background: "rgba(59,130,246,0.12)",
    color: "#bfdbfe",
    borderRadius: "7px",
    padding: "3px 7px",
    fontSize: "10px",
    fontWeight: 700
  }
};

