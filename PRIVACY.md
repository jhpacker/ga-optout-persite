# Privacy Policy — GA Opt-Out (Per Site)

_Last updated: 2026-05-16_

## Summary

This extension does not collect, transmit, sell, or share any personal data.

## What the extension stores

The extension stores **one piece of data**: the list of domains on which you have chosen to block Google Analytics. This list is held in Chrome's `storage.sync` area.

- If you are signed into Chrome and have sync enabled, this list is synchronized across your own Chrome installations by Google's standard sync mechanism. It is not visible to the extension author or to any third party.
- If you are not signed in, the list is stored only on your local device.

You can clear this data at any time by removing all entries from the extension's Options page or by uninstalling the extension.

## What the extension does with network requests

The extension uses Chrome's `declarativeNetRequest` API to redirect outgoing Google Analytics measurement requests (specifically, requests to `/g/collect` endpoints carrying a `tid=G-…` parameter) to a local empty file bundled inside the extension. **These requests never leave your device once redirected.** The extension does not log, retain, or transmit the contents of those requests anywhere.

The extension also uses Chrome's `webRequest` API in observation-only mode to:

1. Count redirected requests per tab so it can display a badge on the toolbar icon.
2. Capture the body of intercepted requests in memory, transiently, only so it can be printed to that page's own DevTools console.

The intercepted request body is held only in the extension's service-worker memory for the lifetime of the request, and is discarded as soon as the request completes. It is not persisted to disk, sent to a server, or shared.

## What the extension does NOT do

- It does not contact any remote server, including any server operated by Quantable or the extension author.
- It does not include any analytics, telemetry, error reporting, or crash reporting.
- It does not read, store, or transmit the content of web pages you visit, beyond the URL pattern matching needed to recognize Google Analytics requests on configured domains.
- It does not sell or share any data with third parties — there is no data leaving your browser to sell or share.

## Permissions

- `declarativeNetRequest` — to redirect matching Google Analytics requests to the bundled empty file.
- `webRequest` — to count redirected requests and capture request bodies for local DevTools console logging.
- `storage` — to persist your configured site list.
- `host_permissions: <all_urls>` — Google Analytics server-side relays can be hosted on any custom domain (e.g. `gtm.example.com`), so the redirect rule must be allowed to operate on any host. The extension does not actually act on requests outside the Google Analytics request pattern.

## Contact

For questions about this policy, contact Quantable at [https://quantable.com](https://quantable.com).
