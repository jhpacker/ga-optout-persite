const STORAGE_KEY = 'blockedSites';
const $sites = document.getElementById('sites');
const $save = document.getElementById('save');
const $status = document.getElementById('status');

function normalize(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0];
}

async function load() {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const sites = stored[STORAGE_KEY] || [];
  $sites.value = sites.join('\n');
}

async function save() {
  const sites = $sites.value
    .split('\n')
    .map(normalize)
    .filter(s => s.length > 0 && s.includes('.'));
  const unique = Array.from(new Set(sites));
  await chrome.storage.sync.set({ [STORAGE_KEY]: unique });
  $sites.value = unique.join('\n');
  $status.textContent = `Saved ${unique.length} site${unique.length === 1 ? '' : 's'}.`;
  setTimeout(() => { $status.textContent = ''; }, 2000);
}

$save.addEventListener('click', save);
load();
