# Exception Workbook

Compare two spreadsheets and download an exception workbook. Load file A and file B, match rows on a reference and an amount, and download one `.xlsx` of what matched and what did not.

English is the default. Thai is available at `/th/`. It is a browser utility, not an editor, account system, or hosted database.

Search volume for the wording below is **UNKNOWN**. Nothing in this repository estimates traffic or revenue.

## Matching rules

A row matches only when both of these are true:

1. The reference is the same after normalization.
2. The amount is the same after normalization.

References are trimmed, lowercased, and Unicode-normalized (NFKC). Whitespace, non-breaking spaces, and light punctuation (`- _ . / \ # ,` and similar) are removed. `INV-9`, `inv 9`, and ` INV-9 ` match. `ORD1001` does not match `ORD1002`. There is no fuzzy matching.

Amounts accept numbers and numeric text. Thousands commas, common currency codes, and symbols including `$`, `€`, `£`, `¥`, and `฿` are removed. `1,234` is one thousand two hundred thirty-four. `1,23` is one point twenty-three. Parentheses mark a negative amount. Text with more than 4 decimal places is rejected. Spreadsheet numbers are read at 4 decimal places.

Dates are shown and are not required. Turn on **Require dates to match** to also require the calendar date. ISO `YYYY-MM-DD` is always accepted. Slash dates need an unambiguous day/month, or an explicit day-first or month-first setting. Excel serial dates are accepted when the cell is a serial number or a real date. A different amount is `AMOUNT MISMATCH` even if the dates differ too.

If a normalized reference appears more than once in either file, every copy is `DUPLICATE`. Those rows are not paired and are not merged.

| Status | Meaning |
| --- | --- |
| MATCHED | Same reference and same amount |
| AMOUNT MISMATCH | Same reference, different amount |
| ONLY IN FILE A | Reference is only in file A |
| ONLY IN FILE B | Reference is only in file B |
| DUPLICATE | Reference repeats in file A or file B |
| DATE MISMATCH | Same reference and amount, but dates differ and date matching is on |

Empty references and amounts that are not numbers stop the comparison. The message names the file, column, and row numbers. It does not print the bad cell.

The first worksheet in each workbook is used. Row 1 is the header. Fully blank rows are skipped. Other sheets are ignored.

## Workbook sheets

Default English names:

- **Summary**
- **Matched**
- **Exceptions**
- **Only in A**
- **Only in B**
- **Duplicates** (only if any exist)

When the Thai locale is selected, sheet names and status labels in the download follow the Thai UI. Source cell text is preserved.

## Privacy

Files are read with SheetJS in the browser and never uploaded. Sample buttons fetch only the public sample workbooks that ship with this site. There is no account, database, or analytics of cell values.

The page states: “Your files are processed in your browser and never uploaded.”

Analytics is off unless you set `globalThis.__EXCEPTION_WORKBOOK_ANALYTICS__` to a function. That function receives only an event name: `page_view`, `demo_started`, `file_a_loaded`, `file_b_loaded`, `comparison_started`, `comparison_completed`, `export_downloaded`, `comparison_failed`. Filenames, references, and amounts are not sent.

## Formats and limits

- Input: `.xlsx`, `.xls`, `.csv` (comma-separated, UTF-8)
- Output: `.xlsx`
- Maximum: **8,000 data rows** and **4 MB** per file

## Sample files

- `public/sample-orders.xlsx` / `public/sample-payments.xlsx` — English/international fake data (default demo)
- `public/sample-orders-th.xlsx` / `public/sample-payments-th.xlsx` — Thai-header fake data (secondary demo)

Both pairs have 47 and 43 data rows and the same classification shape: 30 matches, 6 amount mismatches, 8 only in A, 5 only in B, 5 duplicate rows.

```bash
npm run samples
```

## Language

- `/` — English (default, `lang="en"`)
- `/th/` — Thai (`lang="th"`)
- Switch: **English | ไทย**
- Reloading `/` stays English. Matching logic does not depend on locale.

## Commands

```bash
npm install
npm test
npm run dev
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
npm run samples
npm run site-files
```

## SEO

| Tag | Value |
| --- | --- |
| Title | Compare Two Excel Files and Find Unmatched Rows |
| H1 | Compare two Excel files and find unmatched rows |
| Description | Compare two Excel or CSV files by reference and amount, then download an Excel report of matches, mismatches, and unmatched rows. |
| English canonical | `{origin}/` |
| Thai canonical | `{origin}/th/` |

Search volume is **UNKNOWN**.

`site.config.json` holds the public origin. The committed value is `https://exception-workbook.test` (a `.test` placeholder for local/config checks). **`example.com` is rejected** by `assertProductionOrigin()` during `npm run site-files` and `npm run build`.

Before a public deploy:

1. Set `origin` in `site.config.json` to your real `https` origin (no trailing slash).
2. `npm run site-files`
3. `npm test`
4. `npm run build`
5. Upload `dist/` so `/` and `/th/` both serve their `index.html`, and static files under `/` remain reachable.

## Deploy

```bash
cd /agent/repos/exception-workbook
# edit site.config.json origin to the real https origin
npm ci
npm run site-files
npm test
npm run build
# upload dist/ to any static host
```

No server, environment variable, database, auth, payments, ads, or outreach tooling.

## Later limit

A later paid version could raise the 8,000-row and 4 MB browser limit. This version has no paywall.
