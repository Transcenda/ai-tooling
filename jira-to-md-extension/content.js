// content.js — Jira to Markdown scraper
// Supports: classic Jira HTML export (jira.issueviews), modern Jira (atlassian.net)

(function () {
  // ─── Helpers ────────────────────────────────────────────────────────────────

  function getText(...selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.innerText?.trim()) return el.innerText.trim();
    }
    return '';
  }

  function getFieldValue(label) {
    // Classic Jira HTML export: <td class="fieldLabelArea">Label</td><td>value</td>
    const tds = document.querySelectorAll('td.fieldLabelArea, th.fieldLabelArea, .field-label, dt');
    for (const td of tds) {
      if (td.innerText?.trim().toLowerCase().startsWith(label.toLowerCase())) {
        const valueEl = td.nextElementSibling;
        if (valueEl) return valueEl.innerText?.trim() || '';
      }
    }
    // Modern Jira: look for [data-testid] or labeled sections
    const labels = document.querySelectorAll('[data-testid*="field"] label, [class*="field-label"]');
    for (const l of labels) {
      if (l.innerText?.trim().toLowerCase().startsWith(label.toLowerCase())) {
        const parent = l.closest('[data-testid*="field"], [class*="field"]');
        if (parent) {
          const val = parent.querySelector('[class*="field-value"], [data-testid*="field-value"]');
          if (val) return val.innerText?.trim() || '';
        }
      }
    }
    return '';
  }

  // Convert an HTML element's content to Markdown
  function htmlToMarkdown(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    // Remove Jira UI chrome
    clone.querySelectorAll('button, .assistive, [aria-hidden="true"], .aui-icon').forEach(n => n.remove());

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.replace(/\u00a0/g, ' ');
      }
      const tag = node.tagName?.toLowerCase();
      const kids = () => Array.from(node.childNodes).map(walk).join('');

      switch (tag) {
        case 'h1': return `# ${kids()}\n\n`;
        case 'h2': return `## ${kids()}\n\n`;
        case 'h3': return `### ${kids()}\n\n`;
        case 'h4': return `#### ${kids()}\n\n`;
        case 'p':  {
          const inner = kids().trim();
          return inner ? `${inner}\n\n` : '';
        }
        case 'br': return '\n';
        case 'strong': case 'b': return `**${kids()}**`;
        case 'em': case 'i': return `*${kids()}*`;
        case 'code': return `\`${kids()}\``;
        case 'pre': return `\`\`\`\n${node.innerText?.trim()}\n\`\`\`\n\n`;
        case 'a': {
          const href = node.href || '';
          const text = kids().trim();
          return href ? `[${text}](${href})` : text;
        }
        case 'ul': {
          const items = Array.from(node.children).map(li => {
            const content = Array.from(li.childNodes).map(walk).join('').trim();
            return `- ${content}`;
          });
          return items.join('\n') + '\n\n';
        }
        case 'ol': {
          const items = Array.from(node.children).map((li, i) => {
            const content = Array.from(li.childNodes).map(walk).join('').trim();
            return `${i + 1}. ${content}`;
          });
          return items.join('\n') + '\n\n';
        }
        case 'li': return kids();
        case 'blockquote': {
          return kids().trim().split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
        }
        case 'hr': return '\n---\n\n';
        case 'table': {
          const rows = Array.from(node.querySelectorAll('tr'));
          if (!rows.length) return '';
          const toRow = (cols) => '| ' + cols.join(' | ') + ' |';
          const header = Array.from(rows[0].querySelectorAll('th,td')).map(c => c.innerText.trim());
          const sep = header.map(() => '---');
          const body = rows.slice(1).map(r =>
            Array.from(r.querySelectorAll('th,td')).map(c => c.innerText.trim())
          );
          return [toRow(header), toRow(sep), ...body.map(toRow)].join('\n') + '\n\n';
        }
        case 'div': case 'section': case 'span': case 'td': case 'th':
        case 'tbody': case 'thead': case 'tr':
          return kids();
        default:
          return kids();
      }
    }

    return walk(clone).replace(/\n{3,}/g, '\n\n').trim();
  }

  // ─── Classic Jira HTML export scraper ───────────────────────────────────────
  // (jira.issueviews:issue-html style)

  function scrapeClassicExport() {
    const data = {};

    // Issue ID from title or breadcrumb
    data.id = getText('#key-val', '.issue-key', 'h1.issue-header') ||
      document.title.match(/\[([A-Z]+-\d+)\]/)?.[1] || '';

    // Title
    data.title = getText('#summary-val', '.issue-summary h1') ||
      document.title.replace(/^\[.*?\]\s*/, '').replace(/\s*-\s*Jira$/, '').trim();

    // Status
    data.status = getText('#status-val .jira-issue-status-lozenge, #status-val');

    // All field rows: classic export uses a table with fieldLabelArea
    const rows = document.querySelectorAll('tr');
    const fieldMap = {};
    rows.forEach(row => {
      const label = row.querySelector('td.fieldLabelArea, th.fieldLabelArea');
      const value = row.querySelector('td:not(.fieldLabelArea), td.value');
      if (label && value) {
        const key = label.innerText.trim().replace(/:$/, '').toLowerCase();
        fieldMap[key] = value.innerText.trim();
      }
    });

    data.type        = fieldMap['type'] || fieldMap['issue type'] || '';
    data.priority    = fieldMap['priority'] || '';
    data.assignee    = fieldMap['assignee'] || '';
    data.reporter    = fieldMap['reporter'] || '';
    data.sprint      = fieldMap['sprint'] || '';
    data.storyPoints = fieldMap['story points'] || fieldMap['story point estimate'] || '';
    data.epic        = fieldMap['epic link'] || fieldMap['epic name'] || '';
    data.team        = fieldMap['team'] || '';
    data.component   = fieldMap['component/s'] || fieldMap['component'] || '';
    data.fixVersion  = fieldMap['fix version/s'] || fieldMap['fix version'] || '';
    data.created     = fieldMap['created'] || '';
    data.updated     = fieldMap['updated'] || '';
    data.labels      = fieldMap['labels'] || '';
    data.engineer    = fieldMap['engineer(s)'] || fieldMap['engineers'] || '';
    data.workType    = fieldMap['work type'] || '';
    data.release     = fieldMap['mcc release #'] || fieldMap['release'] || '';
    data.mccReleasePriority = fieldMap['release priority'] || '';

    // Issue links
    const linkEls = document.querySelectorAll('#linkingmodule .link-content, .issuelinktype');
    data.links = Array.from(linkEls).map(el => el.innerText.trim()).filter(Boolean);

    // Description sections — the classic export puts the description in #descriptionmodule
    const descModule = document.querySelector('#descriptionmodule .field-ignore-highlight, #description-val, .issuebody .description');
    data.rawDescEl = descModule;

    // Also try to parse named sections from the description (Background, Requirement, etc.)
    data.sections = parseDescriptionSections(descModule);
    data.comments = scrapeComments();

    data.url = window.location.href;
    return data;
  }

  // ─── Modern Jira (atlassian.net) scraper ────────────────────────────────────

  function scrapeModernJira() {
    const data = {};

    data.id = getText(
      '[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]',
      '#breadcrumb-current-issue-container a'
    ) || window.location.pathname.split('/browse/')?.[1]?.split('?')[0] || '';

    data.title = getText(
      '[data-testid="issue.views.issue-base.foundation.summary.heading"]',
      'h1[data-testid*="summary"]',
      '#summary-val'
    );

    data.status = getText(
      '[data-testid*="status"] button span',
      '[data-testid*="status-field"] span',
      '#status-val'
    );

    data.type        = getText('[data-testid*="issuetype"] span, [data-testid*="issue-type"] img');
    data.priority    = getText('[data-testid*="priority"] span, #priority-val');
    data.assignee    = getText('[data-testid*="assignee"] [data-testid*="name"], #assignee-val');
    data.reporter    = getText('[data-testid*="reporter"] [data-testid*="name"], #reporter-val');
    data.storyPoints = getText('[data-testid*="story-point"], [data-testid*="story_point"], #customfield_10016-val, #customfield_10028-val');
    data.sprint      = getText('[data-testid*="sprint"] a, #customfield_10020-val');
    data.epic        = getText('[data-testid*="epic"] a, #customfield_10014-val');
    data.labels      = Array.from(document.querySelectorAll('[data-testid*="labels"] a, #labels-val a')).map(e => e.innerText.trim()).join(', ');
    data.fixVersion  = getText('#fixfor-val, [data-testid*="fixversion"]');
    data.component   = getText('#components-val, [data-testid*="component"]');

    const descEl = document.querySelector(
      '[data-testid="issue.views.field.rich-text.description"] .ProseMirror,' +
      '[data-testid="issue.views.field.rich-text.description"],' +
      '#description-val'
    );
    data.rawDescEl = descEl;
    data.sections = parseDescriptionSections(descEl);
    data.links = Array.from(document.querySelectorAll('[data-testid*="issue-link"] a')).map(e => e.innerText.trim()).filter(Boolean);
    data.comments = scrapeComments();
    data.url = window.location.href;
    return data;
  }

  // ─── Comments ────────────────────────────────────────────────────────────────
  // Supports Jira Server/Data Center activity stream and modern Jira Cloud comment items.

  function scrapeComments() {
    const containerSelectorSets = [
      // Modern Jira Cloud
      '[data-testid="issue.activity.comment"]',
      '[data-testid$="comment-base-item"]',
      '[data-testid*="comment"][data-testid*="item"]',
      // Jira Server / Data Center
      '.issue-data-block[id^="comment-"]',
      '.activity-comment',
    ];

    let containers = [];
    for (const sel of containerSelectorSets) {
      containers = Array.from(document.querySelectorAll(sel));
      if (containers.length) break;
    }

    const comments = [];
    const seen = new Set();

    containers.forEach(c => {
      const authorEl = c.querySelector(
        '[data-testid*="author"], a.user-hover, .action-details a, [class*="author"] a, [class*="author"]'
      );
      const authorName = authorEl?.innerText?.trim() || '';

      const timeEl = c.querySelector('time, [data-testid*="timestamp"], .action-details time, .livestamp');
      const timestamp = timeEl?.getAttribute('datetime') || timeEl?.innerText?.trim() || '';

      const bodyEl = c.querySelector(
        '[data-testid*="comment-body"], [data-testid*="content"] .ProseMirror, .ProseMirror, .action-body, .comment-body'
      ) || c;

      const body = htmlToMarkdown(bodyEl).trim();
      if (!body) return;

      const key = authorName + '|' + body.slice(0, 80);
      if (seen.has(key)) return;
      seen.add(key);

      comments.push({ author: authorName, timestamp, body });
    });

    return comments;
  }

  // ─── Parse named sections from description ──────────────────────────────────
  // Looks for ### Background, ### Requirement, ### Test Plan, ### Acceptance Criteria

  function parseDescriptionSections(el) {
    if (!el) return {};
    const sections = {};
    const knownSections = ['background', 'repository', 'requirement', 'requirements',
      'architectural change', 'impacted modules', 'test plan', 'acceptance criteria'];

    // Try heading-based splitting
    const headings = el.querySelectorAll('h1,h2,h3,h4,strong');
    if (headings.length > 0) {
      headings.forEach(h => {
        const name = h.innerText.trim().toLowerCase().replace(/[:#]+$/, '');
        if (knownSections.some(s => name.includes(s))) {
          // Collect content until next heading
          let content = '';
          let next = h.nextElementSibling;
          while (next && !['H1','H2','H3','H4'].includes(next.tagName)) {
            // If it's a strong that looks like a heading, stop too
            if (next.tagName === 'STRONG' && knownSections.some(s => next.innerText.toLowerCase().includes(s))) break;
            content += htmlToMarkdown(next) + '\n';
            next = next.nextElementSibling;
          }
          sections[name] = content.trim();
        }
      });
    }

    // Fallback: raw text, split by ### headings
    if (Object.keys(sections).length === 0) {
      const raw = el.innerText || '';
      const lines = raw.split('\n');
      let currentSection = 'description';
      let buffer = [];

      lines.forEach(line => {
        const trimmed = line.trim();
        const matchedSection = knownSections.find(s =>
          trimmed.toLowerCase().replace(/[:#\s]+/g, ' ').trim() === s ||
          trimmed.toLowerCase().startsWith('### ' + s)
        );
        if (matchedSection) {
          if (buffer.length) sections[currentSection] = buffer.join('\n').trim();
          currentSection = matchedSection;
          buffer = [];
        } else {
          buffer.push(line);
        }
      });
      if (buffer.length) sections[currentSection] = buffer.join('\n').trim();
    }

    return sections;
  }

  // ─── Build the final Markdown string ────────────────────────────────────────

  function buildMarkdown(data) {
    const s = data.sections || {};
    const lines = [];

    // Header
    lines.push(`# ${data.id} — ${data.title}`);
    lines.push('');

    // Metadata table
    const meta = [
      ['Status',        data.status],
      ['Type',          data.type],
      ['Reporter',      data.reporter],
      ['Assignee',      data.assignee || data.engineer],
      ['Sprint',        data.sprint],
      ['Story Points',  data.storyPoints],
      ['Epic',          data.epic],
      ['Team',          data.team],
      ['Component',     data.component],
      ['Fix Version',   data.fixVersion],
      ['Labels',        data.labels],
      ['Work Type',     data.workType],
      ['Release',       data.release],
      ['Release Priority', data.mccReleasePriority],
      ['Created',       data.created],
      ['Updated',       data.updated],
    ].filter(([, v]) => v);

    if (meta.length) {
      lines.push('| Field | Value |');
      lines.push('| --- | --- |');
      meta.forEach(([k, v]) => lines.push(`| ${k} | ${v} |`));
      lines.push('');
    }

    // Issue links
    if (data.links?.length) {
      lines.push('**Issue Links:**');
      data.links.forEach(l => lines.push(`- ${l}`));
      lines.push('');
    }

    // Named sections in preferred order
    const sectionOrder = [
      ['background',           '### Background'],
      ['repository',           '### Repository'],
      ['requirement',          '### Requirement'],
      ['requirements',         '### Requirement'],
      ['architectural change', '### Architectural Change'],
      ['impacted modules',     '### Impacted Modules'],
      ['test plan',            '### Test Plan'],
      ['acceptance criteria',  '### Acceptance Criteria'],
    ];

    const rendered = new Set();
    sectionOrder.forEach(([key, heading]) => {
      if (s[key] && !rendered.has(key)) {
        rendered.add(key);
        lines.push(heading);
        lines.push(s[key]);
        lines.push('');
      }
    });

    // Anything leftover that wasn't in our known order
    Object.entries(s).forEach(([key, val]) => {
      if (!rendered.has(key) && key !== 'description' && val) {
        rendered.add(key);
        const heading = '### ' + key.replace(/\b\w/g, c => c.toUpperCase());
        lines.push(heading);
        lines.push(val);
        lines.push('');
      }
    });

    // If no sections were found, dump raw description
    if (rendered.size === 0 && data.rawDescEl) {
      lines.push('### Description');
      lines.push(htmlToMarkdown(data.rawDescEl));
      lines.push('');
    }

    // Comments
    if (data.comments?.length) {
      lines.push('### Comments');
      lines.push('');
      data.comments.forEach(c => {
        const header = [c.author, c.timestamp].filter(Boolean).join(' — ');
        lines.push(`**${header || 'Comment'}**`);
        lines.push('');
        lines.push(c.body);
        lines.push('');
      });
    }

    // Footer
    lines.push('---');
    lines.push(`*Source: ${data.url}*`);

    return lines.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  // ─── Detect which Jira variant and run ──────────────────────────────────────

  function isClassicExport() {
    return !!document.querySelector('#jira, #issue-content, #descriptionmodule, .issuebody, td.fieldLabelArea');
  }

  window.__jiraToMd = function () {
    try {
      const data = isClassicExport() ? scrapeClassicExport() : scrapeModernJira();

      // Better fallback for ID from URL
      if (!data.id) {
        data.id = window.location.pathname.match(/([A-Z]+-\d+)/)?.[1] ||
          document.title.match(/([A-Z]+-\d+)/)?.[1] || 'TICKET';
      }
      if (!data.title) {
        data.title = document.title.replace(/\[.*?\]\s*/g, '').replace(/\s*-\s*Jira$/, '').trim();
      }

      const md = buildMarkdown(data);
      return { success: true, markdown: md, filename: `${data.id}.md` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // Signal ready
  document.dispatchEvent(new CustomEvent('jiraToMdReady'));
})();
