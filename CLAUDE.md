# Project: GA Opt-Out Per Site

Chrome MV3 extension that sinks Google Analytics measurement requests to a local empty response on a user-configured allowlist of sites.

## Status

Implemented. Files:

- `manifest.json` — MV3 manifest
- `background.js` — service worker; syncs `chrome.storage.sync` to dynamic dNR rules and maintains a per-tab badge count of sunk requests
- `options.html` / `options.js` — full site list editor
- `popup.html` / `popup.js` — toolbar-button popup with a "Block GA on this site" checkbox for the current tab
- `content.js` — content script that logs each sunk request to the page's DevTools console
- `null-hit-sink.txt` — empty file used as the redirect target

## Key design decisions

- **Mechanism:** `declarativeNetRequest` dynamic rules with `action.type: "redirect"` to `extensionPath: "/null-hit-sink.txt"`. Chosen over `block` because the redirect resolves as a clean 200 and keeps the original request visible in DevTools Network — that visibility is the whole point of the project.
- **Per-site gating:** one dNR rule with `initiatorDomains` set to the configured list. Subdomain matching is implicit.
- **Endpoint regex:** `^https?://[^/]+/g/collect\?.*\btid=G-` — matches `/g/collect` on **any host**, gated by a `tid=G-` query parameter. This catches GA4 gtag, regional `*.google-analytics.com` endpoints, **and server-side GTM relays on custom domains** (which present a `/g/collect` endpoint to the browser). Universal Analytics (`tid=UA-`) and the server-side Measurement Protocol (`/mp/collect`) are not matched — the former is deprecated, the latter is server-to-server.
- **Resource types matched:** `xmlhttprequest`, `ping`, `image`, `script`, `other` — covers `fetch`, `sendBeacon`, pixel, and JSONP variants.
- **List semantics:** allowlist of sites to block on. GA flows normally everywhere else.
- **Toolbar popup:** clicking the action button opens a small popup with a "Block GA on this site" checkbox. Toggling adds/removes the current tab's hostname (lowercased, `www.` stripped) from the allowlist. Storage update triggers `background.js` to rebuild the dNR rules. If the page is already blocked via a *parent* domain in the list, the checkbox is shown as checked-and-disabled with a note pointing to the Options page.
- **Per-tab badge:** the action button shows a red badge with the count of sunk GA requests on the current tab, observed via `webRequest.onBeforeRedirect`. Cleared on hard navigations (`tabs.onUpdated` with `status === 'loading'`) and on SPA route changes (`tabs.onUpdated` with `changeInfo.url`).
- **Per-tab icon state:** the action icon swaps between a colorful "blocking" variant (`icons/icon{16,32}.png`) and a pale grayscale "not blocking" variant (`icons/icon{16,32}-off.png`) based on whether the active tab's host is on the allowlist. Tooltip changes in parallel via `chrome.action.setTitle`. Updates fire on `tabs.onActivated`, `tabs.onUpdated` (URL change or load), and after every `rebuildRules()` (which iterates all tabs).
- **In-memory allowlist cache:** `allowlistCache` (a `Set` of normalized hosts) is hydrated from `chrome.storage.sync` at top level on every service-worker startup and re-populated inside `rebuildRules()`. Used to short-circuit `webRequest.onBeforeRequest` before the (expensive) POST body decode runs for non-allowlisted initiators, and to drive the per-tab icon swap. Acceptable tradeoff: a `/g/collect` request arriving before the initial async hydration completes won't have its body captured (the dNR redirect still fires because dNR rules are persisted by Chrome).
- **Console logging:** the same `onBeforeRedirect` handler sends a message to the affected tab/frame; a content script (`content.js`, injected at `document_start` on all http(s) frames) writes a `[GA Opt-Out] sunk …` line to the page's DevTools console, including the request URL and a short summary of the `tid` and event name (`en`/`t`) parsed from the query string.
- **Permissions:** `declarativeNetRequest` + `storage` + `webRequest` (observation-only, for the badge and POST body capture) + `host_permissions: ["<all_urls>"]` (because the endpoint regex is host-agnostic to cover SSGTM custom domains; this also grants the popup access to the active tab's URL without needing `activeTab` or `tabs`).

## Explicitly out of scope

- `ga-audiences` remarketing pings.
- GTM container script (`gtm.js`) — blocking it would break unrelated tags.
- Popup detail view of payloads — verification of *what* GA would have sent is DevTools-only.
- **Non-MP-shaped server-side analytics.** The detection regex matches any host serving a `/collect`-style endpoint with `tid=G-…`, which covers vanilla sGTM relays. Setups that transform the request into a custom shape — e.g. Stape-hosted proxies that rename params or use custom event paths — won't match and won't be blocked. Adding support for one of those would mean extending the regex with that vendor's request shape.
