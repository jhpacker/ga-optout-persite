# GA Opt-Out Per Site

A Chrome extension that blocks Google Analytics requests on a configurable list of sites, **without hiding what GA would have done**.

Unlike Google's official GA opt-out (which is global and silent), this extension:

- Works **per site** — you choose which domains opt out.
- Leaves the GA tag running normally on the page. `gtag`, dataLayer pushes, and tag firing all behave as usual.
- Intercepts the outbound `/g/collect` request and redirects it to a local empty response. Nothing reaches Google.
- Keeps the original request fully visible in the **DevTools Network panel** — URL, query string, and POST body — so you can still inspect exactly what GA would have measured.

## How it works

Uses Manifest V3 `declarativeNetRequest` to redirect matching GA requests to a bundled empty file (`null-hit-sink.txt`). The rule matches any host serving a `/g/collect` request with a `tid=G-…` query parameter, and is gated by `initiatorDomains` so it only fires on the configured sites.

This covers:

- `*.google-analytics.com` (including regional endpoints like `region1.google-analytics.com`)
- Server-side GTM relays on custom domains (e.g. `gtm.example.com`)

The toolbar button shows a small badge with the count of sunk GA requests on the current tab. Each sunk request also produces a `[GA Opt-Out] sunk …` line in the page's DevTools **console**, with the request URL and a short summary of the property ID and event name parsed from the query string.

## Configuration

1. Load the extension as an unpacked extension at `chrome://extensions` (enable Developer mode → Load unpacked → select this folder).
2. Two ways to manage the list:
   - **Toolbar button:** click the extension's icon on any page to open a popup with a "Block GA on this site" checkbox. Toggling it adds or removes the current site.
   - **Options page:** edit the full list directly, one domain per line (e.g. `example.com`). Subdomains of listed domains are included automatically.

## Scope

- Only `/collect`-style measurement endpoints with a GA4 `tid=G-…` parameter are sunk.
- `ga-audiences` remarketing pings and the GTM container script (`gtm.js`) are **not** blocked.

## Limitations

- Per-site matching uses the request initiator. GA calls from a third-party iframe embedded on a listed site may not match (the iframe's domain is the initiator, not the top-level page).
- To verify *what* GA would have sent (full URL, query string, POST body), use the DevTools Network panel — the popup only shows a sunk-request count.
- **Server-side GA setups are only caught when they emit a recognizable GA Measurement Protocol request** — that is, a `/collect`-style path with a `tid=G-…` parameter. A vanilla server-side GTM (sGTM) deployment on a custom domain like `gtm.example.com` fits that shape and is blocked. Setups that transform analytics traffic into a custom format — for example, a hosted relay like **Stape** with renamed parameters, custom event paths, or proxied non-MP payloads — won't match the pattern and won't be blocked. If you need to cover one of those, you'd have to extend the detection regex with the specific shape of that vendor's requests.
