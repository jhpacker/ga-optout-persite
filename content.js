chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== 'ga-sunk') return;
  let summary = '';
  try {
    const u = new URL(msg.url);
    const tid = u.searchParams.get('tid');
    const en = u.searchParams.get('en') || u.searchParams.get('t');
    summary = [tid, en].filter(Boolean).join(' / ');
  } catch {}
  const args = [
    `%c[GA Opt-Out]%c sunk ${msg.method || ''}${summary ? ' (' + summary + ')' : ''} → ${msg.url}`,
    'color:#d33;font-weight:bold',
    'color:inherit'
  ];
  if (msg.body) args.push('\nbody:', msg.body);
  console.log(...args);
});
