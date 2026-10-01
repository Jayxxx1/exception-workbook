import { useEffect, useId, useRef, useState } from "react";
import { track, trackPageView } from "./analytics";
import { compareSheets, summaryNote, type CompareInput } from "./compare";
import { messageOf, UserFacingError } from "./errors";
import { detectColumns } from "./headers";
import { detectLocale, localePath, statusLabel, t, type Locale } from "./i18n";
import { fileTooLargeMessage, MAX_DATA_ROWS, MAX_FILE_BYTES, MAX_FILE_MB } from "./limits";
import { formatMoney, type DateFormat } from "./normalize";
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

function inputFrom(fileA: Slot, fileB: Slot, dateMatching: boolean, dateFormat: DateFormat): CompareInput {
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
    dateFormat,
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

async function fetchSample(name: string, label: string, sampleFail: string): Promise<ParsedSheet> {
  const response = await fetch(`/${name}`);
  if (!response.ok) throw new UserFacingError(sampleFail);
  return readSpreadsheet(name, new Uint8Array(await response.arrayBuffer()), label);
}

export function App() {
  const fileAInput = useId();
  const fileBInput = useId();
  const resultRef = useRef<HTMLElement>(null);
  const [locale, setLocale] = useState<Locale>(() => detectLocale());
  const [fileA, setFileA] = useState<Slot | null>(null);
  const [fileB, setFileB] = useState<Slot | null>(null);
  const [dateMatching, setDateMatching] = useState(false);
  const [dateFormat, setDateFormat] = useState<DateFormat>("auto");
  const [result, setResult] = useState<Comparison | null>(null);
  const [noteKey, setNoteKey] = useState<"allMatched" | "noneMatched" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<"A" | "B" | null>(null);

  useEffect(() => {
    trackPageView();
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!result || !resultRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [result]);

  function clearResult() {
    setResult(null);
    setNoteKey(null);
  }

  function switchLocale(next: Locale) {
    if (next === locale) return;
    const path = localePath(next);
    window.history.pushState({}, "", path);
    setLocale(next);
  }

  useEffect(() => {
    const onPop = () => setLocale(detectLocale());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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
      setError(t(locale, "loadBothFirst"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await paint();
      track("comparison_started");
      const comparison = compareSheets(inputFrom(fileA, fileB, dateMatching, dateFormat));
      track("comparison_completed");
      setResult(comparison);
      setNoteKey(summaryNote(comparison));
    } catch (caught) {
      track("comparison_failed");
      setResult(null);
      setNoteKey(null);
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onSample(kind: "en" | "th") {
    track("demo_started");
    setBusy(true);
    setError(null);
    let started = false;
    try {
      await paint();
      const names =
        kind === "th"
          ? (["sample-orders-th.xlsx", "sample-payments-th.xlsx"] as const)
          : (["sample-orders.xlsx", "sample-payments.xlsx"] as const);
      const [sheetA, sheetB] = await Promise.all([
        fetchSample(names[0], "File A", t(locale, "sampleFail")),
        fetchSample(names[1], "File B", t(locale, "sampleFail")),
      ]);
      const slotA = slotFromSheet(sheetA);
      const slotB = slotFromSheet(sheetB);
      setFileA(slotA);
      setFileB(slotB);
      setDateMatching(false);
      setDateFormat("auto");
      track("file_a_loaded");
      track("file_b_loaded");
      started = true;
      track("comparison_started");
      const comparison = compareSheets(inputFrom(slotA, slotB, false, "auto"));
      track("comparison_completed");
      setResult(comparison);
      setNoteKey(summaryNote(comparison));
    } catch (caught) {
      if (started) track("comparison_failed");
      setResult(null);
      setNoteKey(null);
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onDownload() {
    if (!result) return;
    try {
      const { buildWorkbookBytes, downloadBytes } = await import("./workbook");
      downloadBytes(buildWorkbookBytes(result, locale), "exception-workbook.xlsx");
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
        <p className="wordmark">{t(locale, "wordmark")}</p>
        <div className="top-right">
          <p className="formats">{t(locale, "formats")}</p>
          <nav className="lang" aria-label="Language">
            <button
              type="button"
              className={locale === "en" ? "lang-btn is-active" : "lang-btn"}
              data-testid="lang-en"
              onClick={() => switchLocale("en")}
            >
              {t(locale, "langEnglish")}
            </button>
            <span aria-hidden="true">|</span>
            <button
              type="button"
              className={locale === "th" ? "lang-btn is-active" : "lang-btn"}
              data-testid="lang-th"
              onClick={() => switchLocale("th")}
            >
              {t(locale, "langThai")}
            </button>
          </nav>
        </div>
      </header>
      <h1>{t(locale, "h1")}</h1>
      <p className="lede">{t(locale, "lede")}</p>
      <p className="privacy">{t(locale, "privacy")}</p>
      <ol className="steps">
        <li>{t(locale, "step1")}</li>
        <li>{t(locale, "step2")}</li>
        <li>{t(locale, "step3")}</li>
        <li>{t(locale, "step4")}</li>
      </ol>

      <div className="files">
        <FileCard
          title={t(locale, "fileA")}
          inputId={fileAInput}
          testId="file-a"
          locale={locale}
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
          title={t(locale, "fileB")}
          inputId={fileBInput}
          testId="file-b"
          locale={locale}
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
        <div className="control-grid">
          <label className="date-rule">
            <input
              type="checkbox"
              checked={dateMatching}
              onChange={(event) => {
                setDateMatching(event.target.checked);
                clearResult();
              }}
            />
            <span>{t(locale, "requireDates")}</span>
          </label>
          <label className="field-label">
            {t(locale, "dateFormat")}
            <select
              data-testid="date-format"
              value={dateFormat}
              onChange={(event) => {
                setDateFormat(event.target.value as DateFormat);
                clearResult();
              }}
            >
              <option value="auto">{t(locale, "dateFormatAuto")}</option>
              <option value="dmy">{t(locale, "dateFormatDmy")}</option>
              <option value="mdy">{t(locale, "dateFormatMdy")}</option>
            </select>
          </label>
        </div>
        <p className="rule">{t(locale, "rule")}</p>
        <div className="actions">
          <button className="button primary" type="button" data-testid="compare" disabled={busy} onClick={() => void onCompare()}>
            {busy ? t(locale, "working") : t(locale, "compare")}
          </button>
          <button className="button" type="button" data-testid="download" disabled={!result || busy} onClick={() => void onDownload()}>
            {t(locale, "download")}
          </button>
          <button className="button" type="button" data-testid="try-sample" disabled={busy} onClick={() => void onSample("en")}>
            {t(locale, "trySample")}
          </button>
          <button className="button quiet" type="button" data-testid="try-thai-sample" disabled={busy} onClick={() => void onSample("th")}>
            {t(locale, "tryThaiSample")}
          </button>
        </div>
        {error ? <p className="alert" role="alert" data-testid="error">{error}</p> : null}
        {noteKey ? <p className="note" role="status" data-testid="result-note">{t(locale, noteKey)}</p> : null}
      </div>

      {result ? (
        <section className="result" ref={resultRef} aria-label={t(locale, "summary")} data-testid="summary">
          <h2>{t(locale, "summary")}</h2>
          <p className="file-meta">
            {result.fileAName} · {result.rowsA} {t(locale, "dataRows")} · {result.sheetAName} — {result.fileBName} · {result.rowsB}{" "}
            {t(locale, "dataRows")} · {result.sheetBName}
          </p>
          <table className="counts">
            <caption className="sr-only">{t(locale, "summary")}</caption>
            <thead>
              <tr>
                <th>{t(locale, "category")}</th>
                <th>{t(locale, "rows")}</th>
                <th>{t(locale, "amountCol")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t(locale, "matchedPairs")}</th>
                <td data-testid="count-matched">{result.matched.length}</td>
                <td>{formatMoney(result.totals.matched)}</td>
              </tr>
              <tr>
                <th scope="row">{t(locale, "amountMismatches")}</th>
                <td data-testid="count-mismatch">{amountMismatches}</td>
                <td>{formatMoney(result.totals.mismatchDifference)}</td>
              </tr>
              <tr>
                <th scope="row">{t(locale, "onlyInA")}</th>
                <td data-testid="count-only-a">{result.onlyA.length}</td>
                <td>{formatMoney(result.totals.onlyA)}</td>
              </tr>
              <tr>
                <th scope="row">{t(locale, "onlyInB")}</th>
                <td data-testid="count-only-b">{result.onlyB.length}</td>
                <td>{formatMoney(result.totals.onlyB)}</td>
              </tr>
              <tr>
                <th scope="row">{t(locale, "duplicateRows")}</th>
                <td data-testid="count-duplicate">{result.duplicates.length}</td>
                <td></td>
              </tr>
              <tr>
                <th scope="row">{t(locale, "dateMismatches")}</th>
                <td data-testid="count-date">{dateMismatches}</td>
                <td>{result.dateMatching ? t(locale, "required") : t(locale, "notRequired")}</td>
              </tr>
            </tbody>
          </table>
          <p className="totals">
            <span>
              {t(locale, "fileATotal")} {formatMoney(result.totals.amountA)}
            </span>
            <span>
              {t(locale, "fileBTotal")} {formatMoney(result.totals.amountB)}
            </span>
            <span>
              {t(locale, "net")} {formatMoney(result.totals.amountA - result.totals.amountB)}
            </span>
          </p>
          <h3 className="preview-title">{t(locale, "preview")}</h3>
          <div className="table-wrap">
            <table className="preview">
              <thead>
                <tr>
                  <th>{t(locale, "status")}</th>
                  <th>{t(locale, "reference")}</th>
                  <th>{t(locale, "amount")} A</th>
                  <th>{t(locale, "amount")} B</th>
                  <th>{t(locale, "difference")}</th>
                  <th>{t(locale, "rowA")}</th>
                  <th>{t(locale, "rowB")}</th>
                </tr>
              </thead>
              <tbody>
                {previewRows(result).map((row) => (
                  <tr key={`${row.status}-${row.file ?? "pair"}-${row.rowA ?? "x"}-${row.rowB ?? "x"}-${row.referenceA}-${row.referenceB}`}>
                    <td className={`status status-${row.status}`}>{statusLabel(locale, row.status)}</td>
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

      <section className="seo-block" aria-labelledby="what-title">
        <h2 id="what-title">{t(locale, "whatTitle")}</h2>
        <p>{t(locale, "whatBody")}</p>
      </section>
      <section className="seo-block" aria-labelledby="how-title">
        <h2 id="how-title">{t(locale, "howTitle")}</h2>
        <ol>
          <li>{t(locale, "how1")}</li>
          <li>{t(locale, "how2")}</li>
          <li>{t(locale, "how3")}</li>
          <li>{t(locale, "how4")}</li>
        </ol>
      </section>
      <section className="seo-block" aria-labelledby="faq-title">
        <h2 id="faq-title">{t(locale, "faqTitle")}</h2>
        <h3>{t(locale, "faqOnlineQ")}</h3>
        <p>{t(locale, "faqOnlineA")}</p>
        <h3>{t(locale, "faqCsvQ")}</h3>
        <p>{t(locale, "faqCsvA")}</p>
        <h3>{t(locale, "faqUploadQ")}</h3>
        <p>{t(locale, "faqUploadA")}</p>
        <h3>{t(locale, "faqUnmatchedQ")}</h3>
        <p>{t(locale, "faqUnmatchedA")}</p>
        <h3>{t(locale, "faqAmountQ")}</h3>
        <p>{t(locale, "faqAmountA")}</p>
      </section>

      <footer className="footer">
        <p>{t(locale, "footer", { rows: MAX_DATA_ROWS.toLocaleString("en-US"), mb: MAX_FILE_MB })}</p>
      </footer>
    </main>
  );
}

function FileCard({
  title,
  inputId,
  testId,
  locale,
  slot,
  dragging,
  onDrag,
  onFile,
  onChange,
}: {
  title: string;
  inputId: string;
  testId: string;
  locale: Locale;
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
        {slot ? `${slot.sheet.rows.length.toLocaleString("en-US")} ${t(locale, "dataRows")} · ${slot.sheet.sheetName}` : t(locale, "noFileYet")}
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
        {slot ? <strong>{slot.sheet.fileName}</strong> : <span>{t(locale, "dropHint")}</span>}
      </label>
      {slot && slot.sheet.sheetCount > 1 ? (
        <p className="sheet-note">{t(locale, "firstSheetNote", { sheet: slot.sheet.sheetName })}</p>
      ) : null}
      {slot ? (
        <div className="fields">
          <label className="field-label">
            {t(locale, "reference")}
            <select aria-label={`${title} ${t(locale, "reference")}`} value={slot.reference} onChange={(event) => onChange({ reference: event.target.value })}>
              <option value="">{t(locale, "chooseColumn")}</option>
              {slot.sheet.headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {t(locale, "amount")}
            <select aria-label={`${title} ${t(locale, "amount")}`} value={slot.amount} onChange={(event) => onChange({ amount: event.target.value })}>
              <option value="">{t(locale, "chooseColumn")}</option>
              {slot.sheet.headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            {t(locale, "date")}
            <select aria-label={`${title} ${t(locale, "date")}`} value={slot.date} onChange={(event) => onChange({ date: event.target.value })}>
              <option value="">{t(locale, "noDate")}</option>
              {slot.sheet.headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </section>
  );
}
