# Exception Workbook

Compare two spreadsheets and download an exception workbook. The page loads file A and file B, matches rows on a reference and an amount, and writes one `.xlsx` of what matched and what did not.

It is a single-page utility. It is not an editor, an account system, or a hosted database.

Search volume for the wording below is **UNKNOWN**. Nothing in this repository estimates traffic or revenue.

## Matching rules

A row matches only when both of these are true:

1. The reference is the same after normalization.
2. The amount is the same after normalization.

References are trimmed, lowercased, and Unicode-normalized (NFKC). Whitespace, non-breaking spaces, and light punctuation (`- _ . / \ # ,` and similar) are removed. `INV-9`, `inv 9`, and ` INV-9 ` match. `ORD1001` does not match `ORD1002`. There is no fuzzy matching.

Amounts accept numbers and numeric text. Thousands commas, a trailing `บาท`, and currency symbols including `฿`, `$`, `€`, and `£` are removed. `฿1,250.00` and `1250` match. Parentheses mark a negative amount. Text with more than 4 decimal places is rejected. Spreadsheet numbers are read at 4 decimal places so ordinary binary rounding does not create a false mismatch.

Dates are shown and are not required. Turn on **Require dates to match** to also require the calendar date. Accepted date text is `YYYY-MM-DD` or day/month/year. A different amount is reported as `AMOUNT MISMATCH` even if the dates differ too.

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

- **Summary** — row counts, category counts, amount totals, mismatch difference, and net file A minus file B
- **Matched**
- **Exceptions** — status, both references, both amounts, difference, both dates, both row numbers
- **Only in A**
- **Only in B**
- **Duplicates** — only if at least one duplicate exists

Displayed references, amounts, and dates are the source cell text. File totals include every readable data row.

## Privacy

Files are read with SheetJS in the browser. They are not uploaded. The sample button only fetches the two public sample workbooks that ship with this site. There is no account, database, or analytics of cell values.

The line “Your files are processed in your browser and are not uploaded.” is on the page because that is how the tool works.

Analytics is off unless you set `globalThis.__EXCEPTION_WORKBOOK_ANALYTICS__` to a function. That function receives one event name and nothing else: `page_view`, `demo_started`, `file_a_loaded`, `file_b_loaded`, `comparison_started`, `comparison_completed`, `export_downloaded`, `comparison_failed`. Filenames, references, and amounts are not sent. The tool works when the function is absent.

## Formats and limits

- Input: `.xlsx`, `.xls`, `.csv` (comma-separated, UTF-8)
- Output: `.xlsx`
- Maximum: **8,000 data rows** and **4 MB** per file

Larger files are refused in the browser and are not uploaded. A header row plus 8,000 data rows is accepted. 8,001 is not.

## Sample files

`public/sample-orders.xlsx` and `public/sample-payments.xlsx` are fake Thai-language orders and payments (47 and 43 data rows). They include matches, whitespace and `฿` amount variants, amount mismatches, rows only in one file, and duplicate references. **Try with sample files** loads them and compares with date matching off.

Regenerate them with:

```bash
npm run samples
```

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

`npm run dev` serves the tool at `http://127.0.0.1:5173`. `npm test` runs Vitest. `npm run build` typechecks and writes `dist/`.

## SEO

There is one page. The title and H1 use the phrases “compare two Excel files” and “find unmatched rows”, which are the phrases on the comparison and reconciliation pages reviewed while writing the copy. Volume for those phrases is UNKNOWN.

| Tag | Value |
| --- | --- |
| Title | Compare Two Excel Files and Find Unmatched Rows |
| H1 | Compare two Excel files and find unmatched rows |
| Description | Compare two Excel or CSV files by reference and amount, then download an exception workbook of matches, mismatches, and unmatched rows. |
| Canonical | `{origin}/` |

`site.config.json` holds the origin, title, H1, description, and privacy sentence. The default origin is `https://example.com`, the standard placeholder, not a deployed site. `index.html` contains one H1, the meta description, canonical URL, Open Graph tags, a Twitter card, `robots` index,follow, a favicon, and `WebApplication` structured data. There are no reviews and no rating. `public/robots.txt` allows `/` and points at `public/sitemap.xml`, which lists that one URL.

Before a public deploy, change `origin` and regenerate the site files:

```bash
# edit origin in site.config.json, with no trailing slash
npm run site-files
npm test
npm run build
```

## Deploy

The production build is static. No server, environment variable, or database is required.

1. Install Node.js 20 or newer.
2. `npm ci` (or `npm install` if you do not have a lockfile yet).
3. Set `origin` in `site.config.json` to the public `https` origin, with no trailing slash.
4. `npm run site-files`
5. `npm test`
6. `npm run build`
7. Upload the contents of `dist/` to any static host so `index.html` is served at `/`.
8. Open `/`, `/robots.txt`, `/sitemap.xml`, and `/favicon.svg`. The canonical URL in the page source should be the origin from step 3.

Sample workbooks are in `dist/` because they live in `public/`. Do not add a rewrite that sends every path to `index.html` unless `/sample-orders.xlsx`, `/robots.txt`, and `/sitemap.xml` are still served as files.

## Later limit

A later paid version could raise the 8,000-row and 4 MB browser limit for larger exports. This version has no paywall, no checkout, and no account.
