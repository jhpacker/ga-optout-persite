const STORAGE_KEY = 'blockedSites';

function normalize(host) {
  return host.toLowerCase().replace(/^www\./, '');
}

function findParentMatch(host, list) {
  return list.find(e => host !== e && host.endsWith('.' + e));
}

async function init() {
  const $host = document.getElementById('host');
  const $toggle = document.getElementById('toggle');
  const $note = document.getElementById('note');
  const $label = document.getElementById('label');
  const $options = document.getElementById('options');

  $options.addEventListener('click', () => chrome.runtime.openOptionsPage());

  const $copy = document.getElementById('copy-filter');
  $copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('[GA Opt-Out]');
      $copy.textContent = 'copied';
      $copy.classList.add('copied');
      setTimeout(() => {
        $copy.textContent = 'copy';
        $copy.classList.remove('copied');
      }, 1200);
    } catch {}
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = '';
  try {
    const u = new URL(tab?.url || '');
    if (u.protocol === 'http:' || u.protocol === 'https:') host = u.hostname;
  } catch {}

  if (!host) {
    $host.textContent = '(not a regular web page)';
    $label.classList.add('disabled');
    return;
  }

  const normalized = normalize(host);
  $host.textContent = normalized;

  try {
    const badgeText = await chrome.action.getBadgeText({ tabId: tab.id });
    const count = parseInt(badgeText, 10);
    if (count > 0) {
      const $stats = document.getElementById('stats');
      $stats.hidden = false;
      $stats.textContent = `${count} Google Analytics request${count === 1 ? '' : 's'} sunk on this page`;
    }
  } catch {}

  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const list = stored[STORAGE_KEY] || [];
  const isExact = list.includes(normalized);
  const parent = findParentMatch(normalized, list);

  if (parent && !isExact) {
    $toggle.checked = true;
    $toggle.disabled = true;
    $label.classList.add('disabled');
    $note.textContent = `Already blocked via parent domain: ${parent}. Edit the full list to change this.`;
    return;
  }

  $toggle.disabled = false;
  $toggle.checked = isExact;

  $toggle.addEventListener('change', async () => {
    const cur = (await chrome.storage.sync.get(STORAGE_KEY))[STORAGE_KEY] || [];
    let next;
    if ($toggle.checked) {
      next = Array.from(new Set([...cur, normalized]));
    } else {
      next = cur.filter(e => e !== normalized);
    }
    await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  });
}

init();
