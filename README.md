# Exception Workbook

Compare two spreadsheets and download an exception workbook. Load file A and file B, match rows on a reference and an amount, and download one `.xlsx` of what matched and what did not.

English is the default at `/`. Thai is available at `/th/`. It is a browser utility, not an editor, account system, or hosted database.

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

Default English names: Summary, Matched, Exceptions, Only in A, Only in B, and Duplicates when needed. Thai locale downloads use Thai sheet names. Source cell text is preserved.

## Privacy

Files are read with SheetJS in the browser and never uploaded. Sample buttons fetch only the public sample workbooks that ship with this site. There is no account, database, or analytics of cell values.

The page states: “Your files are processed in your browser and never uploaded.”

Analytics is off unless you set `globalThis.__EXCEPTION_WORKBOOK_ANALYTICS__` to a function. That function receives only an event name. Filenames, references, and amounts are not sent.

## Formats and limits

- Input: `.xlsx`, `.xls`, `.csv` (comma-separated, UTF-8)
- Output: `.xlsx`
- Maximum: **8,000 data rows** and **4 MB** per file

## Sample files

- `sample-orders.xlsx` / `sample-payments.xlsx` — English/international fake data (default demo)
- `sample-orders-th.xlsx` / `sample-payments-th.xlsx` — Thai-header fake data

Both pairs classify as: 30 matches, 6 amount mismatches, 8 only in A, 5 only in B, 5 duplicate rows.

```bash
npm run samples
```

## Language

- `/` — English (`lang="en"`)
- `/th/` — Thai (`lang="th"`)
- Switch: **English | ไทย**
- Matching logic does not depend on locale.

## Commands

```bash
npm install
npm test
SITE_ORIGIN=http://127.0.0.1:4173 npm run site-files
SITE_ORIGIN=http://127.0.0.1:4173 npm run build
SITE_ORIGIN=http://127.0.0.1:4173 npm run preview -- --host 127.0.0.1 --port 4173
npm run samples
```

`npm run build` and `npm run site-files` fail if the public origin is empty, `example.com`, or a `.test` host. Set `SITE_ORIGIN` or `site.config.json` `origin`.

## SEO

| Tag | Value |
| --- | --- |
| Title | Compare Two Excel Files and Find Unmatched Rows |
| H1 | Compare two Excel files and find unmatched rows |
| Description | Compare two Excel or CSV files by reference and amount, then download an Excel report of matches, mismatches, and unmatched rows. |
| English canonical | `{origin}/` |
| Thai canonical | `{origin}/th/` |
| hreflang | `en`, `th`, `x-default` → English `/` |

Search volume is **UNKNOWN**.

## Production deployment checklist

Do not invent a domain in the repository. Configure the real HTTPS origin at deploy time.

1. **Configure the public origin** (no trailing slash), either:
   - `export SITE_ORIGIN=https://your-real-domain.tld`
   - or set `"origin": "https://your-real-domain.tld"` in `site.config.json`
2. **Generate site files**
   ```bash
   npm run site-files
   ```
3. **Run tests**
   ```bash
   npm test
   ```
4. **Build**
   ```bash
   npm run build
   ```
5. **Upload `dist/`** to any static host so these paths are real files:
   - `/` → `dist/index.html`
   - `/th/` → `dist/th/index.html`
   - `/robots.txt`
   - `/sitemap.xml`
   - `/favicon.svg`
   - `/og.png`
   - `/sample-orders.xlsx`
   - `/sample-payments.xlsx`
   - `/sample-orders-th.xlsx`
   - `/sample-payments-th.xlsx`
   - `/assets/*`
6. **Do not** configure a catch-all SPA rewrite that sends `/th/`, `.xlsx`, `robots.txt`, or `sitemap.xml` to the English `index.html`.
7. **Verify in a browser** after deploy:
   - open `/` and `/th/`
   - view source: canonical, hreflang, title, one H1, `lang`
   - open `/robots.txt` and `/sitemap.xml` and confirm they use the real HTTPS origin
   - open each sample `.xlsx` URL directly
   - run **Try with sample files**, confirm counts, download the workbook
   - load a `.txt` and confirm a plain-language error
   - in DevTools Network, confirm user spreadsheet files are not uploaded

### Exact command sequence

```bash
cd /agent/repos/exception-workbook
npm ci
export SITE_ORIGIN=https://your-real-domain.tld
npm run site-files
npm test
npm run build
# upload the contents of dist/ to the static host
```

### Static hosting notes

- Serve over **HTTPS**.
- `public/_headers` is copied into `dist/` for hosts that honor Netlify-style headers (CSP, nosniff, cache for `/assets/*`, MIME hints for `.xlsx`).
- `public/_redirects` keeps `/th` → `/th/` without a global SPA fallback.
- Equivalent nginx ideas: TLS termination; `add_header X-Content-Type-Options nosniff`; serve `/th/index.html` for `/th/`; do not `try_files` every unknown path to `/index.html`.
- CSP in `_headers` allows only same-origin scripts/styles/images and `connect-src 'self'` (needed for public sample downloads). There are no third-party analytics or font CDNs in the app.
- Inline critical CSS in the HTML shell needs `style-src 'self' 'unsafe-inline'`.

### Local preview (not production)

```bash
export SITE_ORIGIN=http://127.0.0.1:4173
npm run site-files
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

## Later limit

A later paid version could raise the 8,000-row and 4 MB browser limit. This version has no paywall.
