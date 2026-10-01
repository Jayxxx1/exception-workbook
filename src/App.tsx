import { useEffect, useId, useRef, useState } from "react";
import { track, trackPageView } from "./analytics";
import { compareSheets, STATUS_LABEL, summaryNote, type CompareInput } from "./compare";
import { messageOf, UserFacingError } from "./errors";
import { detectColumns } from "./headers";
import { fileTooLargeMessage, MAX_DATA_ROWS, MAX_FILE_BYTES, MAX_FILE_MB } from "./limits";
import { formatMoney } from "./normalize";
import { SITE_DESCRIPTION, SITE_H1, SITE_PRIVACY } from "../site.config";
import type { ClassifiedRow, Comparison, ParsedSheet } from "./types";

type Slot = {
  sheet: ParsedSheet;
  reference: string;
  amount: string;
  date: string;
};

function slotFromSheet(sheet: ParsedSheet): Slot {
  const detected = detectColumns(sheet.headers);
  return {
    sheet,
    reference: detected.reference ?? "",
    amount: detected.amount ?? "",
    date: detected.date ?? "",
  };
}

function inputFrom(fileA: Slot, fileB: Slot, dateMatching: boolean): CompareInput {
  return {
    fileA: fileA.sheet,
    fileB: fileB.sheet,
    referenceA: fileA.reference,
    amountA: fileA.amount,
    dateA: fileA.date || null,
    referenceB: fileB.reference,
    amountB: fileB.amount,
    dateB: fileB.date || null,
    dateMatching,
  };
}

function previewRows(result: Comparison): ClassifiedRow[] {
  const exceptions = [...result.exceptions, ...result.onlyA, ...result.onlyB, ...result.duplicates];
  return (exceptions.length > 0 ? exceptions : result.matched).slice(0, 8);
}

async function paint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function readSpreadsheet(fileName: string, bytes: Uint8Array, label: string): Promise<ParsedSheet> {
  const { parseSpreadsheet } = await import("./parseSheet");
  return parseSpreadsheet(fileName, bytes, label);
}

async function fetchSample(name: string, label: string): Promise<ParsedSheet> {
  const response = await fetch(`/${name}`);
  if (!response.ok) throw new UserFacingError("The sample files could not be loaded. Refresh the page and try again.");
  return readSpreadsheet(name, new Uint8Array(await response.arrayBuffer()), label);
}

export function App() {
  const fileAInput = useId();
  const fileBInput = useId();
  const resultRef = useRef<HTMLElement>(null);
  const [fileA, setFileA] = useState<Slot | null>(null);
  const [fileB, setFileB] = useState<Slot | null>(null);
  const [dateMatching, setDateMatching] = useState(false);
  const [result, setResult] = useState<Comparison | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<"A" | "B" | null>(null);

  useEffect(() => {
    trackPageView();
  }, []);

  useEffect(() => {
    if (!result || !resultRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [result]);

  function clearResult() {
    setResult(null);
    setNote(null);
  }

  async function loadFile(side: "A" | "B", file: File | undefined) {
    if (!file) return;
    const label = side === "A" ? "File A" : "File B";
    setBusy(true);
    setError(null);
    try {
      await paint();
      if (file.size > MAX_FILE_BYTES) throw new UserFacingError(fileTooLargeMessage(label));
      const sheet = await readSpreadsheet(file.name, new Uint8Array(await file.arrayBuffer()), label);
      const slot = slotFromSheet(sheet);
      if (side === "A") setFileA(slot);
      else setFileB(slot);
      clearResult();
      if (side === "A") track("file_a_loaded");
      else track("file_b_loaded");
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onCompare() {
    if (!fileA || !fileB) {
      setError("Load file A and file B first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await paint();
      track("comparison_started");
      const comparison = compareSheets(inputFrom(fileA, fileB, dateMatching));
      track("comparison_completed");
      setResult(comparison);
      setNote(summaryNote(comparison));
    } catch (caught) {
      track("comparison_failed");
      setResult(null);
      setNote(null);
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onSample() {
    track("demo_started");
    setBusy(true);
    setError(null);
    let started = false;
    try {
      await paint();
      const [sheetA, sheetB] = await Promise.all([
        fetchSample("sample-orders.xlsx", "File A"),
        fetchSample("sample-payments.xlsx", "File B"),
      ]);
      const slotA = slotFromSheet(sheetA);
      const slotB = slotFromSheet(sheetB);
      setFileA(slotA);
      setFileB(slotB);
      setDateMatching(false);
      track("file_a_loaded");
      track("file_b_loaded");
      started = true;
      track("comparison_started");
      const comparison = compareSheets(inputFrom(slotA, slotB, false));
      track("comparison_completed");
      setResult(comparison);
      setNote(summaryNote(comparison));
    } catch (caught) {
      if (started) track("comparison_failed");
      setResult(null);
      setNote(null);
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onDownload() {
    if (!result) return;
    try {
      const { buildWorkbookBytes, downloadBytes } = await import("./workbook");
      downloadBytes(buildWorkbookBytes(result), "exception-workbook.xlsx");
      track("export_downloaded");
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  const amountMismatches = result?.exceptions.filter((row) => row.status === "AMOUNT_MISMATCH").length ?? 0;
  const dateMismatches = result?.exceptions.filter((row) => row.status === "DATE_MISMATCH").length ?? 0;

  return (
    <main className="page">
      <header className="top">
        <p className="wordmark">Exception Workbook</p>
        <p className="formats">.xlsx · .xls · .csv</p>
      </header>
      <h1>{SITE_H1}</h1>
      <p className="lede">{SITE_DESCRIPTION} Load file A and file B, confirm the columns, and download the workbook.</p>
      <p className="thai" lang="th">หัวตารางภาษาไทย เช่น เลขที่ หรือ ยอดเงิน จะถูกเลือกให้อัตโนมัติ และเปลี่ยนเองได้เสมอ</p>
      <p className="privacy">{SITE_PRIVACY}</p>
      <ol className="steps">
        <li>Load file A and file B.</li>
        <li>Confirm the reference, amount, and optional date.</li>
        <li>Compare. Matching is exact after light cleanup.</li>
        <li>Download the exception workbook.</li>
      </ol>

      <div className="files">
        <FileCard
          title="File A"
          inputId={fileAInput}
          testId="file-a"
          slot={fileA}
          dragging={drag === "A"}
          onDrag={(active) => setDrag(active ? "A" : null)}
          onFile={(file) => void loadFile("A", file)}
          onChange={(patch) => {
            setFileA((current) => (current ? { ...current, ...patch } : current));
            clearResult();
          }}
        />
        <FileCard
          title="File B"
          inputId={fileBInput}
          testId="file-b"
          slot={fileB}
          dragging={drag === "B"}
          onDrag={(active) => setDrag(active ? "B" : null)}
          onFile={(file) => void loadFile("B", file)}
          onChange={(patch) => {
            setFileB((current) => (current ? { ...current, ...patch } : current));
            clearResult();
          }}
        />
      </div>

      <div className="controls">
        <label className="date-rule">
          <input
            type="checkbox"
            checked={dateMatching}
            onChange={(event) => {
              setDateMatching(event.target.checked);
              clearResult();
            }}
          />
          <span>Require dates to match</span>
        </label>
        <p className="rule">Rows match when the reference and the amount match. Dates are shown either way. Duplicate references are listed and never merged.</p>
        <div className="actions">
          <button className="button primary" type="button" data-testid="compare" disabled={busy} onClick={() => void onCompare()}>
            {busy ? "Working…" : "Compare"}
          </button>
          <button className="button" type="button" data-testid="download" disabled={!result || busy} onClick={() => void onDownload()}>
            Download workbook
          </button>
          <button className="button" type="button" data-testid="try-sample" disabled={busy} onClick={() => void onSample()}>
            Try with sample files
          </button>
        </div>
        {error ? <p className="alert" role="alert" data-testid="error">{error}</p> : null}
        {note ? <p className="note" role="status" data-testid="result-note">{note}</p> : null}
      </div>

      {result ? (
        <section className="result" ref={resultRef} aria-label="Summary" data-testid="summary">
          <h2>Summary</h2>
          <p className="file-meta">{result.fileAName} · {result.rowsA} rows · {result.sheetAName} — {result.fileBName} · {result.rowsB} rows · {result.sheetBName}</p>
          <table className="counts">
            <caption className="sr-only">Comparison counts</caption>
            <thead>
              <tr><th>Category</th><th>Rows</th><th>Amount</th></tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Matched pairs</th>
                <td data-testid="count-matched">{result.matched.length}</td>
                <td>{formatMoney(result.totals.matched)}</td>
              </tr>
              <tr>
                <th scope="row">Amount mismatches</th>
                <td data-testid="count-mismatch">{amountMismatches}</td>
                <td>{formatMoney(result.totals.mismatchDifference)}</td>
              </tr>
              <tr>
                <th scope="row">Only in file A</th>
                <td data-testid="count-only-a">{result.onlyA.length}</td>
                <td>{formatMoney(result.totals.onlyA)}</td>
              </tr>
              <tr>
                <th scope="row">Only in file B</th>
                <td data-testid="count-only-b">{result.onlyB.length}</td>
                <td>{formatMoney(result.totals.onlyB)}</td>
              </tr>
              <tr>
                <th scope="row">Duplicate rows</th>
                <td data-testid="count-duplicate">{result.duplicates.length}</td>
                <td></td>
              </tr>
              <tr>
                <th scope="row">Date mismatches</th>
                <td data-testid="count-date">{dateMismatches}</td>
                <td>{result.dateMatching ? "Required" : "Not required"}</td>
              </tr>
            </tbody>
          </table>
          <p className="totals">
            <span>File A total {formatMoney(result.totals.amountA)}</span>
            <span>File B total {formatMoney(result.totals.amountB)}</span>
            <span>Net A−B {formatMoney(result.totals.amountA - result.totals.amountB)}</span>
          </p>
          <h3 className="preview-title">Preview</h3>
          <div className="table-wrap">
            <table className="preview">
              <thead>
                <tr>
                  <th>Status</th><th>Reference</th><th>Amount A</th><th>Amount B</th><th>Difference</th><th>Row A</th><th>Row B</th>
                </tr>
              </thead>
              <tbody>
                {previewRows(result).map((row) => (
                  <tr key={`${row.status}-${row.file ?? "pair"}-${row.rowA ?? "x"}-${row.rowB ?? "x"}-${row.referenceA}-${row.referenceB}`}>
                    <td className={`status status-${row.status}`}>{STATUS_LABEL[row.status]}</td>
                    <td>{row.referenceA || row.referenceB}</td>
                    <td>{row.amountADisplay}</td>
                    <td>{row.amountBDisplay}</td>
                    <td>{row.differenceMinor === null ? "" : formatMoney(row.differenceMinor)}</td>
                    <td>{row.rowA ?? ""}</td>
                    <td>{row.rowB ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <footer className="footer">
        <p>Up to {MAX_DATA_ROWS.toLocaleString("en-US")} rows and {MAX_FILE_MB} MB per file. The first sheet in each workbook is used. No account.</p>
      </footer>
    </main>
  );
}

function FileCard({
  title,
  inputId,
  testId,
  slot,
  dragging,
  onDrag,
  onFile,
  onChange,
}: {
  title: string;
  inputId: string;
  testId: string;
  slot: Slot | null;
  dragging: boolean;
  onDrag: (active: boolean) => void;
  onFile: (file: File | undefined) => void;
  onChange: (patch: Partial<Pick<Slot, "reference" | "amount" | "date">>) => void;
}) {
  return (
    <section className="file-card" aria-labelledby={`${inputId}-title`}>
      <h2 id={`${inputId}-title`}>{title}</h2>
      <p className="file-meta">
        {slot ? `${slot.sheet.rows.length.toLocaleString("en-US")} data rows · ${slot.sheet.sheetName}` : "No file yet"}
      </p>
      <label
        className={dragging ? "drop is-drag" : "drop"}
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          onDrag(true);
        }}
        onDragLeave={() => onDrag(false)}
        onDrop={(event) => {
          event.preventDefault();
          onDrag(false);
          onFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          id={inputId}
          className="file-input"
          data-testid={testId}
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {slot ? <strong>{slot.sheet.fileName}</strong> : <span>Drop an .xlsx, .xls, or .csv file, or click to browse</span>}
      </label>
      {slot && slot.sheet.sheetCount > 1 ? (
        <p className="sheet-note">Using the first sheet, “{slot.sheet.sheetName}”. Other sheets are ignored.</p>
      ) : null}
      {slot ? (
        <div className="fields">
          <label>
            Reference
            <select aria-label={`${title} reference`} value={slot.reference} onChange={(event) => onChange({ reference: event.target.value })}>
              <option value="">Choose a column</option>
              {slot.sheet.headers.map((header) => <option key={header} value={header}>{header}</option>)}
            </select>
          </label>
          <label>
            Amount
            <select aria-label={`${title} amount`} value={slot.amount} onChange={(event) => onChange({ amount: event.target.value })}>
              <option value="">Choose a column</option>
              {slot.sheet.headers.map((header) => <option key={header} value={header}>{header}</option>)}
            </select>
          </label>
          <label>
            Date
            <select aria-label={`${title} date`} value={slot.date} onChange={(event) => onChange({ date: event.target.value })}>
              <option value="">Do not use a date</option>
              {slot.sheet.headers.map((header) => <option key={header} value={header}>{header}</option>)}
            </select>
          </label>
        </div>
      ) : null}
    </section>
  );
}
