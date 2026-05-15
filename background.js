const STORAGE_KEY = 'blockedSites';
const RULE_ID = 1;

const GA_COLLECT_REGEX = "^https?://[^/]+/g/collect\\?.*\\btid=G-";

const RESOURCE_TYPES = [
  "xmlhttprequest",
  "ping",
  "image",
  "script",
  "other"
];

function normalizeSite(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0];
}

let allowlistCache = new Set();

async function loadSites() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  return (stored[STORAGE_KEY] || [])
    .map(normalizeSite)
    .filter(s => s.length > 0 && s.includes('.'));
}

async function hydrateCache() {
  allowlistCache = new Set(await loadSites());
}

// Run on every SW startup so the cache is populated before listeners fire.
hydrateCache();

function hostMatches(host) {
  if (!host || allowlistCache.size === 0) return false;
  if (allowlistCache.has(host)) return true;
  for (const d of allowlistCache) {
    if (host.endsWith('.' + d)) return true;
  }
  return false;
}

function urlMatches(rawUrl) {
  if (!rawUrl) return false;
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return hostMatches(u.hostname.replace(/^www\./, ''));
  } catch { return false; }
}

function initiatorMatches(initiator) {
  return urlMatches(initiator);
}

const ICON_ON = { 16: 'icons/icon16.png', 32: 'icons/icon32.png' };
const ICON_OFF = { 16: 'icons/icon16-off.png', 32: 'icons/icon32-off.png' };

async function updateIconForTab(tabId, url) {
  const path = urlMatches(url) ? ICON_ON : ICON_OFF;
  try { await chrome.action.setIcon({ tabId, path }); } catch {}
}

async function refreshAllIcons() {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) {
    if (t.id != null) updateIconForTab(t.id, t.url);
  }
}

async function rebuildRules() {
  const sites = await loadSites();
  allowlistCache = new Set(sites);

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map(r => r.id);

  const addRules = sites.length > 0 ? [{
    id: RULE_ID,
    priority: 1,
    condition: {
      regexFilter: GA_COLLECT_REGEX,
      initiatorDomains: sites,
      resourceTypes: RESOURCE_TYPES
    },
    action: {
      type: "redirect",
      redirect: { extensionPath: "/null-hit-sink.txt" }
    }
  }] : [];

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  refreshAllIcons();
}

async function init() {
  await rebuildRules();
  await chrome.action.setBadgeBackgroundColor({ color: '#d33' });
}

chrome.runtime.onInstalled.addListener((details) => {
  init();
  if (details.reason === 'install') chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(init);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes[STORAGE_KEY]) rebuildRules();
});

const SINK_URL_PREFIX = chrome.runtime.getURL('/null-hit-sink.txt');

const COLLECT_URLS = ['*://*/g/collect*'];

const pendingBodies = new Map();

function decodeBody(rb) {
  if (!rb) return null;
  if (rb.formData) return rb.formData;
  if (rb.raw && rb.raw.length) {
    try {
      const decoder = new TextDecoder('utf-8');
      return rb.raw.map(p => p.bytes ? decoder.decode(p.bytes) : '').join('');
    } catch { return null; }
  }
  return null;
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!initiatorMatches(details.initiator)) return;
    const body = decodeBody(details.requestBody);
    if (body) pendingBodies.set(details.requestId, body);
  },
  { urls: COLLECT_URLS },
  ['requestBody']
);

function clearPending(details) {
  pendingBodies.delete(details.requestId);
}
chrome.webRequest.onCompleted.addListener(clearPending, { urls: COLLECT_URLS });
chrome.webRequest.onErrorOccurred.addListener(clearPending, { urls: COLLECT_URLS });

chrome.webRequest.onBeforeRedirect.addListener(
  async (details) => {
    if (details.tabId < 0) return;
    if (!details.redirectUrl || !details.redirectUrl.startsWith(SINK_URL_PREFIX)) return;
    const current = await chrome.action.getBadgeText({ tabId: details.tabId });
    const next = (parseInt(current, 10) || 0) + 1;
    await chrome.action.setBadgeText({ tabId: details.tabId, text: String(next) });
    const body = pendingBodies.get(details.requestId) || null;
    pendingBodies.delete(details.requestId);
    chrome.tabs.sendMessage(
      details.tabId,
      { type: 'ga-sunk', url: details.url, method: details.method, body },
      { frameId: details.frameId }
    ).catch(() => {});
  },
  { urls: ['<all_urls>'] }
);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' || changeInfo.url) {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
  if (changeInfo.url || changeInfo.status === 'loading') {
    updateIconForTab(tabId, changeInfo.url || tab.url);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    updateIconForTab(tabId, tab.url);
  } catch {}
});
