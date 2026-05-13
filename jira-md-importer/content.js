// Jira MD Importer — content script
// Fills Jira form fields on request from the popup. No UI injected into the page.

// ── Helpers ───────────────────────────────────────────────────────────────────

function setNativeValue(el, value) {
  const proto = el.tagName === 'TEXTAREA'
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ── Field fillers ─────────────────────────────────────────────────────────────

function fillSummary(value) {
  const el =
    document.querySelector('input[name="summary"]')                  ||
    document.querySelector('#summary')                                ||
    document.querySelector('[data-testid="summary-field"] input')     ||
    document.querySelector('[placeholder*="summary" i]')              ||
    document.querySelector('[aria-label*="summary" i]');
  if (!el) return false;
  setNativeValue(el, value);
  return true;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function switchToVisualMode() {
  for (const sel of ['li[data-mode="wysiwyg"] button', 'li[data-mode="visual"] button', '#description-visual-edit']) {
    const el = document.querySelector(sel);
    if (el && el.getAttribute('aria-pressed') !== 'true') {
      el.click();
      await sleep(300);
      return;
    }
  }
}

async function switchToWikiMode() {
  // Jira DC 10.x: <li data-mode="source"> wraps the Text button
  for (const sel of [
    'li[data-mode="source"] button',
    'li[data-mode="source"]',
    '#description-wiki-edit',
    'a[accesskey="w"]',
  ]) {
    const el = document.querySelector(sel);
    if (el && el.getAttribute('aria-pressed') !== 'true') {
      el.click();
      await sleep(400);
      return true;
    }
  }
  return false;
}

async function fillDescription(value) {
  // 1. Try switching to wiki/text mode (exposes plain textarea)
  const switched = await switchToWikiMode();
  if (switched) {
    const ta = document.querySelector(
      'textarea#description, textarea[name="description"], ' +
      '[data-testid="description-field"] textarea'
    );
    if (ta) {
      setNativeValue(ta, value);
      await switchToVisualMode();
      return true;
    }
  }

  // 2. TinyMCE iframe (Jira Server visual mode)
  const tinyIframe = document.querySelector(
    '#description_ifr, '                            +
    'iframe[id*="description"][id*="_ifr"], '        +
    'iframe[title*="description" i], '              +
    '.mce-edit-area iframe'
  );
  if (tinyIframe) {
    try {
      const iDoc = tinyIframe.contentDocument || tinyIframe.contentWindow?.document;
      if (iDoc?.body) {
        iDoc.body.focus();
        iDoc.execCommand('selectAll', false, null);
        iDoc.execCommand('delete', false, null);
        iDoc.execCommand('insertText', false, value);
        iDoc.body.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    } catch (_) {}
  }

  // 3. ProseMirror (Jira Cloud)
  const pm = document.querySelector(
    '[data-testid="description-field"] .ProseMirror, ' +
    '.ak-editor-content-area .ProseMirror, '           +
    '[contenteditable="true"][role="textbox"]'
  );
  if (pm) {
    pm.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, value);
    pm.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  // 4. Last resort: set textarea directly even if hidden (saves on form submit in wiki mode)
  const ta = document.querySelector('textarea#description, textarea[name="description"]');
  if (ta) { setNativeValue(ta, value); return true; }

  return false;
}

function fillLabels(labels) {
  const input = document.querySelector(
    '[data-testid="labels-field"] input, '  +
    'input[placeholder*="label" i], '       +
    '[aria-label*="label" i] input'
  );
  if (!input || !labels.length) return;
  for (const label of labels) {
    input.focus();
    setNativeValue(input, label);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup',   { key: 'Enter', keyCode: 13, bubbles: true }));
  }
}

// ── Dialog detection ──────────────────────────────────────────────────────────

function isCreateDialogOpen() {
  return !!(
    document.querySelector('form[name="jiraform"]') ||
    document.querySelector('[role="dialog"]')       ||
    document.querySelector('.aui-dialog2')          ||
    document.querySelector('.jira-dialog')
  );
}

// ── Message handler ───────────────────────────────────────────────────────────

if (!window.__mdiLoaded) {
  window.__mdiLoaded = true;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'ping') {
      sendResponse({ ok: true });
    } else if (msg.type === 'check-dialog') {
      sendResponse({ open: isCreateDialogOpen() });
    } else if (msg.type === 'fill-fields') {
      (async () => {
        let filled = 0;
        if (msg.summary && fillSummary(msg.summary)) filled++;
        if (msg.description && await fillDescription(msg.description)) filled++;
        fillLabels(msg.labels || []);
        sendResponse({ filled });
      })();
    }
    return true; // keep channel open for async sendResponse
  });
}
