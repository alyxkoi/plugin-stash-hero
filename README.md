# Plugin Warehouse

## Downloads: never buffer file bytes

Plugin zips run 30 GB+. **All download surfaces must use `downloadPlugin()` from
`src/lib/download.ts`** — the single shared implementation. It verifies
entitlement server-side (`r2-download-url`), then navigates the browser to a
short-lived presigned R2 URL that already carries
`Content-Disposition: attachment; filename="<Product Name>.zip"`, so filenames
are correct, Range requests / resumable downloads work, and there is no size
ceiling.

Never use `fetch(url).blob()`, `.arrayBuffer()`, `URL.createObjectURL()`, or
`FileReader` in a download path. Those buffer bytes in JS and truncate every
download at exactly 2 GB (32-bit signed int limit). This regression has shipped
multiple times. An ESLint rule in `eslint.config.js` now fails the build on
those APIs.
