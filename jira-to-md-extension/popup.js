// popup.js

let cachedMarkdown = '';
let cachedFilename = '';
let previewVisible = false;

const statusBox  = document.getElementById('status-box');
const statusText = document.getElementById('status-text');
const btnConvert = document.getElementById('btn-convert');
const btnCopy    = document.getElementById('btn-copy');
const btnPreview = document.getElementById('btn-preview');
const btnLabel   = document.getElementById('btn-label');
const spinner    = document.getElementById('spinner');
const previewEl  = document.getElementById('preview');

function setStatus(msg, type = 'info') {
  statusBox.className = `status-box ${type}`;
  statusText.textContent = msg;
}

function isJiraPage(url) {
  return url && (
    url.includes('/browse/') ||
    url.includes('jira.issueviews') ||
    url.includes('/jira/') ||
    url.includes('atlassian.net')
  );
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function injectAndRun(tabId) {
  // Step 1: inject the content script file
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });

  // Step 2: wait a tick then call __jiraToMd
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (typeof window.__jiraToMd === 'function') {
        return window.__jiraToMd();
      }
      return { success: false, error: 'Function not found after injection' };
    }
  });

  return results?.[0]?.result;
}

function downloadMarkdown(md, filename) {
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename, saveAs: false }, () => {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
}

function highlightMarkdown(md) {
  return md
    .split('\n')
    .map(line => {
      if (/^#{1,4} /.test(line))  return `<span class="md-heading">${escHtml(line)}</span>`;
      if (/^\| /.test(line))      return `<span class="md-meta">${escHtml(line)}</span>`;
      if (/^\*\*/.test(line))     return `<span class="md-bold">${escHtml(line)}</span>`;
      return escHtml(line);
    })
    .join('\n');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Init ─────────────────────────────────────────────────────────────────────

(async () => {
  const tab = await getActiveTab();

  if (!tab?.url || !isJiraPage(tab.url)) {
    setStatus('Not a Jira ticket page', 'error');
    document.getElementById('main-content').innerHTML = `
      <div class="not-jira">
        <div class="icon">🔍</div>
        <p>Navigate to a Jira ticket page first.<br/>Supports Atlassian Cloud and Data Center.</p>
      </div>`;
    return;
  }

  setStatus('Ready — click Convert to export', 'info');
  btnConvert.disabled = false;
  btnCopy.disabled    = false;
  btnPreview.disabled = false;
})();

// ── Shared scrape logic ───────────────────────────────────────────────────────

async function scrape() {
  const tab = await getActiveTab();
  const result = await injectAndRun(tab.id);
  if (!result?.success) {
    throw new Error(result?.error || 'Scraping failed');
  }
  cachedMarkdown = result.markdown;
  cachedFilename = result.filename;
  return result;
}

// ── Convert & Download ────────────────────────────────────────────────────────

btnConvert.addEventListener('click', async () => {
  btnConvert.disabled = true;
  spinner.style.display = 'block';
  btnLabel.textContent = 'Extracting...';
  setStatus('Injecting script & scraping...', 'info');

  try {
    const result = await scrape();
    downloadMarkdown(cachedMarkdown, cachedFilename);
    setStatus(`✓ Downloaded: ${cachedFilename}`, 'success');

    previewEl.innerHTML = highlightMarkdown(
      cachedMarkdown.slice(0, 2000) + (cachedMarkdown.length > 2000 ? '\n...' : '')
    );
    previewEl.style.display = 'block';
    previewVisible = true;
    btnPreview.textContent = '👁 Hide';
  } catch (e) {
    setStatus(`Error: ${e.message}`, 'error');
    console.error('[Jira→MD]', e);
  } finally {
    spinner.style.display = 'none';
    btnLabel.textContent  = '⬇ Convert & Download';
    btnConvert.disabled   = false;
  }
});

// ── Copy ─────────────────────────────────────────────────────────────────────

btnCopy.addEventListener('click', async () => {
  btnCopy.disabled = true;
  btnCopy.textContent = '⏳';

  try {
    if (!cachedMarkdown) await scrape();
    await navigator.clipboard.writeText(cachedMarkdown);
    btnCopy.textContent = '✓ Copied!';
    setStatus('Markdown copied to clipboard', 'success');
    setTimeout(() => { btnCopy.textContent = '📋 Copy MD'; btnCopy.disabled = false; }, 2000);
  } catch (e) {
    setStatus(`Error: ${e.message}`, 'error');
    btnCopy.textContent = '📋 Copy MD';
    btnCopy.disabled = false;
  }
});

// ── Preview toggle ────────────────────────────────────────────────────────────

btnPreview.addEventListener('click', async () => {
  btnPreview.disabled = true;
  btnPreview.textContent = '⏳';

  try {
    if (!cachedMarkdown) await scrape();

    previewVisible = !previewVisible;
    if (previewVisible) {
      previewEl.innerHTML = highlightMarkdown(
        cachedMarkdown.slice(0, 2000) + (cachedMarkdown.length > 2000 ? '\n...' : '')
      );
      previewEl.style.display = 'block';
      btnPreview.textContent = '👁 Hide';
    } else {
      previewEl.style.display = 'none';
      btnPreview.textContent = '👁 Preview';
    }
  } catch (e) {
    setStatus(`Error: ${e.message}`, 'error');
    btnPreview.textContent = '👁 Preview';
  } finally {
    btnPreview.disabled = false;
  }
});
