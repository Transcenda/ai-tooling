// ── MD → Jira wiki converter ──────────────────────────────────────────────────

const PANEL_ATTRS = 'borderStyle=solid|borderColor=#cccccc|titleBGColor=#add8e6|bgColor=#fefaf8';

// Wrap bare URLs in [url] (stops at whitespace, preserves trailing space outside)
function wrapURLs(text) {
  return text.replace(/(https?:\/\/[^\s\]]+)/g, '[$1]');
}

function linesToBullets(text) {
  return text.split('\n').filter(l => l.trim()).map(l => ` * ${l.trim()}`).join('\n');
}

function linesToNumbered(text) {
  return text.split('\n').filter(l => l.trim()).map(l => ` # ${l.trim()}`).join('\n');
}

function buildJiraWiki(sections, repo) {
  // panelFree: {panel} on its own line (free-form content)
  const panelFree = (title, content) =>
    `{panel:title=${title}|${PANEL_ATTRS}}\n${content}\n{panel}`;
  // panelList: {panel} appended to last content line (matches Jira's list export style)
  const panelList = (title, content) =>
    `{panel:title=${title}|${PANEL_ATTRS}}\n${content}{panel}`;

  const blocks = [];

  // Background — bold What/Why labels
  if (sections['background']) {
    const bg = sections['background']
      .replace(/^(What|Why)\s*:/gm, '{*}$1{*}:')
      .trim();
    blocks.push(panelFree('Background', bg));
  }

  // Repository — +repo+ underline + Reference line
  if (repo || sections['repository']) {
    const repoRaw = sections['repository'] || '';
    const refLine = (repoRaw.match(/Reference:.+/) || [])[0] || '';
    blocks.push(panelFree('Repository', `+${repo}+${refLine ? '\n\n' + refLine : ''}`));
  }

  // Requirement — each non-blank line → bullet
  if (sections['requirement']) {
    const stripped = sections['requirement'].replace(/^[\-\*]\s+/gm, '');
    blocks.push(panelList('Requirement', linesToBullets(stripped)));
  }

  // Impacted Modules — split "UX Mock-ups" into its own panel if present inline
  if (sections['impacted modules']) {
    const raw    = sections['impacted modules'];
    const lines  = raw.split('\n');
    const uxIdx  = lines.findIndex(l => /^UX Mock-?ups?/i.test(l.trim()));

    if (uxIdx >= 0) {
      const imItems = lines.slice(0, uxIdx).filter(l => l.trim());
      const uxBody  = lines.slice(uxIdx + 1).join('\n').trim();
      if (imItems.length)
        blocks.push(panelList('Impacted Modules', imItems.map(l => ` * ${l.trim()}`).join('\n')));
      if (uxBody)
        blocks.push(panelFree('UX Mock-ups', wrapURLs(uxBody)));
    } else {
      blocks.push(panelList('Impacted Modules', linesToBullets(raw)));
    }
  }

  // UX Mock-ups as standalone section (if not already split from Impacted Modules)
  if (sections['ux mock-ups']) {
    blocks.push(panelFree('UX Mock-ups', wrapURLs(sections['ux mock-ups'])));
  }

  // Architectural Change — as-is
  if (sections['architectural change']) {
    blocks.push(panelFree('Architectural Change', sections['architectural change'].trim()));
  }

  // Test Plan — each non-blank line → numbered item
  if (sections['test plan']) {
    const stripped = sections['test plan'].replace(/^\d+\.\s+/gm, '');
    blocks.push(panelList('Test Plan', linesToNumbered(stripped)));
  }

  // Acceptance Criteria — "AC XX –/- text" → " * *AC XX* – text"
  if (sections['acceptance criteria']) {
    const ac = sections['acceptance criteria'].split('\n')
      .filter(l => l.trim())
      .map(l => {
        const m = l.match(/^(AC\s*\d+)\s*([–\-])\s*(.+)/i);
        return m ? ` * *${m[1]}* ${m[2]} ${m[3].trim()}` : ` * ${l.trim()}`;
      })
      .join('\n');
    blocks.push(panelList('Acceptance Criteria ', ac));
  }

  return blocks.join('\n');
}

function parseMD(md) {
  const titleMatch = md.match(/^#\s+(.+)/m);
  let summary = titleMatch ? titleMatch[1].trim() : '';
  summary = summary.replace(/^[\w]+-\d+\s*[—\-–]+\s*/, '').trim();

  const sections = {};
  const parts = md.split(/^###\s+/m);
  for (let i = 1; i < parts.length; i++) {
    const nl = parts[i].indexOf('\n');
    if (nl === -1) continue;
    sections[parts[i].slice(0, nl).trim().toLowerCase()] = parts[i].slice(nl + 1).trim();
  }

  const repoMatch = (sections['repository'] || '').match(/\S+/);
  const repo = repoMatch ? repoMatch[0] : '';

  const jiraWiki = buildJiraWiki(sections, repo);

  const labels = repo.split('_').filter(w => w.length > 2 && w !== 'protocol');

  return { summary, repo, jiraWiki, labels, sections };
}

// ── State ────────────────────────────────────────────────────────────────────

let activeTabId = null;
let parsed = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function show(view) {
  document.getElementById('view-idle').style.display   = view === 'idle'   ? '' : 'none';
  document.getElementById('view-import').style.display = view === 'import' ? '' : 'none';
}

function setHint(html, ready = false) {
  const el = document.getElementById('idle-hint');
  el.innerHTML = html;
  el.className = ready ? 'hint ready' : 'hint';
}

function setFillStatus(msg, type = '') {
  const el = document.getElementById('fill-status');
  el.textContent = msg;
  el.className = 'status' + (type ? ' ' + type : '');
}

async function ensureScript(tabId) {
  try {
    // Quick probe — will throw if content script not loaded
    await chrome.tabs.sendMessage(tabId, { type: 'ping' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  }
}

// ── Initialise on popup open ──────────────────────────────────────────────────

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  activeTabId = tab.id;

  if (!tab.url?.startsWith('http')) {
    setHint('Navigate to your Jira page first.');
    return;
  }

  try {
    await ensureScript(tab.id);
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'check-dialog' });
    if (res?.open) {
      setHint('✓ <strong>Create Issue</strong> dialog detected — ready to import.', true);
      document.getElementById('btn-activate').disabled = false;
    } else {
      setHint('Open a Jira <strong>Create Issue</strong> dialog, then click below.');
    }
  } catch {
    setHint('Open a Jira <strong>Create Issue</strong> dialog, then click below.');
  }
})();

// ── Navigation ────────────────────────────────────────────────────────────────

document.getElementById('btn-activate').addEventListener('click', () => show('import'));
document.getElementById('btn-back').addEventListener('click', () => show('idle'));

// ── File handling ─────────────────────────────────────────────────────────────

const dropZone  = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const pasteArea = document.getElementById('paste-area');

document.getElementById('btn-browse').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (f) loadFile(f);
});

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f) loadFile(f);
});

pasteArea.addEventListener('input', () => applyMD(pasteArea.value));

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    pasteArea.value = e.target.result;
    applyMD(e.target.result);
  };
  reader.readAsText(file);
}

function applyMD(md) {
  if (!md.trim()) {
    parsed = null;
    document.getElementById('preview').style.display = 'none';
    document.getElementById('btn-fill').disabled = true;
    return;
  }

  parsed = parseMD(md);

  document.getElementById('prev-summary').textContent = parsed.summary || '(not detected)';
  document.getElementById('prev-repo').textContent    = parsed.repo    || '(none)';
  document.getElementById('prev-labels').textContent  = parsed.labels.join(', ') || '(none)';
  document.getElementById('preview').style.display = '';
  document.getElementById('btn-fill').disabled = !parsed.summary;
  setFillStatus('');
}

// ── Fill ──────────────────────────────────────────────────────────────────────

document.getElementById('btn-fill').addEventListener('click', async () => {
  if (!parsed || !activeTabId) return;
  setFillStatus('Filling fields…');

  try {
    await ensureScript(activeTabId);
    const res = await chrome.tabs.sendMessage(activeTabId, {
      type:        'fill-fields',
      summary:     parsed.summary,
      description: parsed.jiraWiki,
      labels:      parsed.labels,
    });

    if (res?.filled > 0) {
      setFillStatus(`✓ Filled ${res.filled} field${res.filled > 1 ? 's' : ''}`, 'ok');
    } else {
      setFillStatus('⚠ No fields found — is Create Issue dialog open?', 'err');
    }
  } catch {
    setFillStatus('⚠ Could not reach the page — try refreshing.', 'err');
  }
});
