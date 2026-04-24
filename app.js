/**
 * requirements-checker — app.js
 *
 * All logic for:
 *  - Drag-and-drop / file-input handling
 *  - requirements.txt parsing
 *  - PyPI API queries (version info)
 *  - OSV API queries (vulnerability info)
 *  - Table rendering, sorting, filtering, search
 *  - Downloading an updated requirements.txt
 */

'use strict';

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS & CONFIG
══════════════════════════════════════════════════════════════════ */

const PYPI_BASE  = 'https://pypi.org/pypi';
const OSV_QUERY  = 'https://api.osv.dev/v1/query';

/** How many requests to fire in parallel at most */
const CONCURRENCY = 6;

/** Severity labels ordered worst → best */
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'safe', 'unknown'];

/** Tailwind colour tokens mapped to severity strings */
const SEVERITY_STYLES = {
  critical: {
    badge: 'bg-critical-light text-critical border border-critical-border',
    row:   'bg-critical-light/30',
  },
  high: {
    badge: 'bg-high-light text-high border border-high-border',
    row:   'bg-high-light/30',
  },
  medium: {
    badge: 'bg-medium-light text-medium border border-medium-border',
    row:   'bg-medium-light/30',
  },
  low: {
    badge: 'bg-low-light text-low border border-low-border',
    row:   '',
  },
  safe: {
    badge: 'bg-safe-light text-safe border border-safe-border',
    row:   '',
  },
  unknown: {
    badge: 'bg-gray-100 text-gray-500 border border-gray-200',
    row:   '',
  },
};

/** Sample requirements.txt shown when user clicks "Try with a sample file" */
const SAMPLE_REQUIREMENTS = `# Sample requirements.txt for demonstration
requests==2.18.0
flask==0.12.2
django==2.0.0
pillow==5.0.0
numpy==1.14.0
cryptography==2.1.4
pyyaml==3.12
urllib3==1.22
sqlalchemy==1.2.0
celery==4.1.0
`;

/* ══════════════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════════════ */

/** @type {PackageResult[]} */
let results = [];

/** Active filter string ('all' | severity key) */
let activeFilter = 'all';

/** Active search string */
let searchQuery = '';

/** Current sort: { col: string, dir: 'asc'|'desc' } */
let sortState = { col: 'severity', dir: 'asc' };

/** Original raw lines from the uploaded file (preserved for download) */
let rawLines = [];

/* ══════════════════════════════════════════════════════════════════
   DOM REFS
══════════════════════════════════════════════════════════════════ */

const dropZone        = document.getElementById('drop-zone');
const fileInput       = document.getElementById('file-input');
const sampleBtn       = document.getElementById('sample-btn');

const progressSection = document.getElementById('progress-section');
const progressLabel   = document.getElementById('progress-label');
const progressCount   = document.getElementById('progress-count');
const progressBar     = document.getElementById('progress-bar');

const resultsSection  = document.getElementById('results-section');
const resultsBody     = document.getElementById('results-body');
const emptyFilter     = document.getElementById('empty-filter');

const statsBar        = document.getElementById('stats-bar');
const statTotal       = document.getElementById('stat-total');
const statOutdated    = document.getElementById('stat-outdated');
const statVuln        = document.getElementById('stat-vuln');

const downloadBtn     = document.getElementById('download-btn');
const resetBtn        = document.getElementById('reset-btn');
const searchInput     = document.getElementById('search-input');
const selectAll       = document.getElementById('select-all');

/* ══════════════════════════════════════════════════════════════════
   REQUIREMENTS.TXT PARSER
══════════════════════════════════════════════════════════════════ */

/**
 * Parse a requirements.txt file content into an array of package descriptors.
 * Handles:
 *  - Comments (#)
 *  - Blank lines
 *  - Version specifiers (==, >=, <=, ~=, !=, >)
 *  - Extras (package[extra])
 *  - Environment markers (package==1.0; python_version >= "3.6")
 *
 * @param {string} text  Raw file content
 * @returns {{ name: string, pinned: string|null, raw: string }[]}
 */
function parseRequirements(text) {
  const packages = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();

    // Skip empty lines, comments, and options (-r, -e, --index-url, etc.)
    if (!line || line.startsWith('#') || line.startsWith('-')) continue;

    // Strip inline comments
    const withoutComment = line.split('#')[0].trim();
    if (!withoutComment) continue;

    // Strip environment markers (anything after ";")
    const withoutMarker = withoutComment.split(';')[0].trim();

    // Match: package_name[extras]  <operator>  version
    // Operator precedence: == first (pinned), then others
    const match = withoutMarker.match(
      /^([A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?(\[[^\]]+\])?)\s*(==|>=|<=|~=|!=|>|<)?\s*([^\s,]+)?/
    );

    if (!match) continue;

    // Normalise package name: lowercase, replace _ and . with -
    const rawName = match[1].replace(/\[.*\]$/, ''); // strip extras
    const name    = rawName.toLowerCase().replace(/[_.]/g, '-');
    const op      = match[4] || null;
    const version = match[5] || null;

    // Only treat as "pinned" when the operator is exact (==)
    const pinned = op === '==' ? version : null;

    packages.push({ name, pinned, raw: line });
  }

  return packages;
}

/* ══════════════════════════════════════════════════════════════════
   API HELPERS
══════════════════════════════════════════════════════════════════ */

/**
 * Fetch JSON from a URL with a basic timeout.
 * Returns null on any error.
 *
 * @param {string} url
 * @param {object} [init]  fetch() init options
 * @param {number} [timeoutMs]
 * @returns {Promise<any|null>}
 */
async function fetchJSON(url, init = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Query PyPI for a package.
 * Returns { latest, summary, homePage } or null.
 *
 * @param {string} name
 * @returns {Promise<{ latest: string, summary: string, homePage: string }|null>}
 */
async function queryPyPI(name) {
  const data = await fetchJSON(`${PYPI_BASE}/${encodeURIComponent(name)}/json`);
  if (!data?.info) return null;
  return {
    latest:   data.info.version || 'unknown',
    summary:  data.info.summary || '',
    homePage: data.info.home_page || data.info.project_url || `https://pypi.org/project/${name}`,
  };
}

/**
 * Query OSV for vulnerabilities affecting a package at a specific version.
 * If version is null, queries for any vulnerability on that package.
 *
 * Returns an array of vulnerability objects (may be empty).
 *
 * @param {string} name
 * @param {string|null} version
 * @returns {Promise<object[]>}
 */
async function queryOSV(name, version) {
  const body = {
    package: { name, ecosystem: 'PyPI' },
  };
  if (version) body.version = version;

  const data = await fetchJSON(
    OSV_QUERY,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    }
  );

  return data?.vulns ?? [];
}

/* ══════════════════════════════════════════════════════════════════
   SEVERITY LOGIC
══════════════════════════════════════════════════════════════════ */

/**
 * Given the pinned version and the latest version, plus vulnerability data,
 * determine the overall severity label for a package.
 *
 * Rules (worst first):
 *  - Any vuln with CVSS critical (≥9) → critical
 *  - Any vuln with CVSS high (≥7)     → high
 *  - Any vuln present                 → medium
 *  - Outdated (pinned != latest)       → low
 *  - Up to date, no vulns             → safe
 *
 * @param {string|null} pinned
 * @param {string} latest
 * @param {object[]} vulns
 * @returns {'critical'|'high'|'medium'|'low'|'safe'|'unknown'}
 */
function calcSeverity(pinned, latest, vulns) {
  if (!latest || latest === 'unknown') return 'unknown';

  if (vulns.length > 0) {
    let maxScore = 0;
    for (const v of vulns) {
      // OSV severity can live in v.severity[] or v.database_specific
      const scores = extractCVSSScores(v);
      for (const s of scores) {
        if (s > maxScore) maxScore = s;
      }
    }
    if (maxScore >= 9.0) return 'critical';
    if (maxScore >= 7.0) return 'high';
    return 'medium';   // vulns exist but score unavailable or <7
  }

  // No vulns — check if outdated
  if (pinned && pinned !== latest) return 'low';

  return 'safe';
}

/**
 * Extract all CVSS base scores from an OSV vuln object.
 * @param {object} vuln
 * @returns {number[]}
 */
function extractCVSSScores(vuln) {
  const scores = [];
  if (Array.isArray(vuln.severity)) {
    for (const s of vuln.severity) {
      // CVSS_V3 score lives in s.score (a full vector or just the number)
      const num = parseFloat(s.score);
      if (!isNaN(num)) scores.push(num);

      // Try to extract from CVSS vector string (e.g. CVSS:3.1/AV:N/.../7.5)
      if (typeof s.score === 'string') {
        const m = s.score.match(/(\d+\.\d+)$/);
        if (m) scores.push(parseFloat(m[1]));
      }
    }
  }
  if (vuln.database_specific?.cvss) {
    const num = parseFloat(vuln.database_specific.cvss);
    if (!isNaN(num)) scores.push(num);
  }
  return scores;
}

/* ══════════════════════════════════════════════════════════════════
   CONCURRENCY HELPER
══════════════════════════════════════════════════════════════════ */

/**
 * Run an async task for each item in `items` with at most `limit` concurrent
 * executions.  Calls `onProgress(completed, total)` after each task finishes.
 *
 * @template T, R
 * @param {T[]} items
 * @param {(item: T) => Promise<R>} task
 * @param {number} limit
 * @param {(done: number, total: number) => void} onProgress
 * @returns {Promise<R[]>}  Results in the same order as items
 */
async function pLimit(items, task, limit, onProgress) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let done = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await task(items[i]);
      done++;
      onProgress(done, items.length);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

/* ══════════════════════════════════════════════════════════════════
   MAIN CHECK FLOW
══════════════════════════════════════════════════════════════════ */

/**
 * Orchestrate the full check for a parsed list of packages.
 * Updates the UI as packages are processed.
 *
 * @param {{ name: string, pinned: string|null, raw: string }[]} packages
 */
async function checkPackages(packages) {
  // Show progress UI
  resultsSection.classList.add('hidden');
  progressSection.classList.remove('hidden');
  progressBar.style.width = '0%';
  progressLabel.textContent = 'Checking packages…';
  progressCount.textContent = `0 / ${packages.length}`;

  results = [];

  /**
   * @param {{ name: string, pinned: string|null, raw: string }} pkg
   * @returns {Promise<PackageResult>}
   */
  async function checkOne(pkg) {
    const [pypiData, vulns] = await Promise.all([
      queryPyPI(pkg.name),
      queryOSV(pkg.name, pkg.pinned),
    ]);

    const latest   = pypiData?.latest   ?? 'unknown';
    const summary  = pypiData?.summary  ?? '';
    const homePage = pypiData?.homePage ?? `https://pypi.org/project/${pkg.name}`;
    const severity = calcSeverity(pkg.pinned, latest, vulns);

    return {
      name:     pkg.name,
      pinned:   pkg.pinned,
      latest,
      summary,
      homePage,
      vulns,
      severity,
      raw:      pkg.raw,
      selected: false,
    };
  }

  results = await pLimit(packages, checkOne, CONCURRENCY, (done, total) => {
    const pct = Math.round((done / total) * 100);
    progressBar.style.width = `${pct}%`;
    progressCount.textContent = `${done} / ${total}`;
  });

  // Transition to results
  progressSection.classList.add('hidden');
  showResults();
}

/* ══════════════════════════════════════════════════════════════════
   RESULTS RENDERING
══════════════════════════════════════════════════════════════════ */

/** Re-render the table based on current results, filter, sort, search */
function showResults() {
  resultsSection.classList.remove('hidden');
  updateStats();
  renderTable();
}

/** Update the header stats bar */
function updateStats() {
  const total    = results.length;
  const outdated = results.filter(r => r.pinned && r.pinned !== r.latest).length;
  const vuln     = results.filter(r => r.vulns.length > 0).length;

  statTotal.textContent    = `${total} package${total !== 1 ? 's' : ''}`;
  statOutdated.textContent = outdated ? `${outdated} outdated` : '';
  statVuln.textContent     = vuln     ? `${vuln} vulnerable` : '';
  statsBar.classList.remove('hidden');
  statsBar.classList.add('flex');
}

/** Return filtered + sorted + searched slice of results */
function getVisibleResults() {
  let filtered = results.slice();

  // Filter by severity
  if (activeFilter !== 'all') {
    filtered = filtered.filter(r => r.severity === activeFilter);
  }

  // Filter by search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(r => r.name.includes(q) || r.summary.toLowerCase().includes(q));
  }

  // Sort
  const { col, dir } = sortState;
  filtered.sort((a, b) => {
    let va, vb;
    if (col === 'severity') {
      va = SEVERITY_ORDER.indexOf(a.severity);
      vb = SEVERITY_ORDER.indexOf(b.severity);
    } else if (col === 'vulns') {
      va = a.vulns.length;
      vb = b.vulns.length;
    } else {
      va = (a[col] ?? '').toString().toLowerCase();
      vb = (b[col] ?? '').toString().toLowerCase();
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  return filtered;
}

/** Full table re-render */
function renderTable() {
  const visible = getVisibleResults();

  // Toggle empty state
  emptyFilter.classList.toggle('hidden', visible.length > 0);
  resultsBody.innerHTML = '';

  for (const pkg of visible) {
    resultsBody.appendChild(buildRow(pkg));
  }

  // Sync select-all checkbox
  const checkboxes = resultsBody.querySelectorAll('.row-checkbox');
  selectAll.checked = checkboxes.length > 0 && [...checkboxes].every(c => c.checked);
  selectAll.indeterminate = !selectAll.checked && [...checkboxes].some(c => c.checked);

  // Update sort indicators in headers
  document.querySelectorAll('.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === sortState.col) {
      th.classList.add(sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

/**
 * Build a single <tr> for a package result.
 * @param {PackageResult} pkg
 * @returns {HTMLTableRowElement}
 */
function buildRow(pkg) {
  const s = SEVERITY_STYLES[pkg.severity] ?? SEVERITY_STYLES.unknown;
  const isOutdated = pkg.pinned && pkg.pinned !== pkg.latest;
  const notFound   = pkg.latest === 'unknown';

  const tr = document.createElement('tr');
  tr.className = `result-row hover:bg-gray-50 transition-colors ${s.row}`;
  tr.dataset.name = pkg.name;

  // ── Checkbox ──
  const tdCheck = document.createElement('td');
  tdCheck.className = 'td-cell w-8';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'row-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500';
  checkbox.checked = pkg.selected;
  checkbox.addEventListener('change', () => {
    pkg.selected = checkbox.checked;
    syncSelectAll();
  });
  tdCheck.appendChild(checkbox);
  tr.appendChild(tdCheck);

  // ── Package name ──
  const tdName = document.createElement('td');
  tdName.className = 'td-cell';
  tdName.innerHTML = `
    <div class="flex flex-col">
      <span class="font-medium text-gray-900">${escHtml(pkg.name)}</span>
      ${pkg.summary ? `<span class="text-xs text-gray-400 mt-0.5 line-clamp-1">${escHtml(pkg.summary)}</span>` : ''}
    </div>`;
  tr.appendChild(tdName);

  // ── Pinned version ──
  const tdCurrent = document.createElement('td');
  tdCurrent.className = 'td-cell font-mono text-gray-600';
  tdCurrent.textContent = pkg.pinned ?? '—';
  tr.appendChild(tdCurrent);

  // ── Latest version ──
  const tdLatest = document.createElement('td');
  tdLatest.className = 'td-cell font-mono';
  if (notFound) {
    tdLatest.innerHTML = `<span class="text-gray-400 text-xs">not found</span>`;
  } else if (isOutdated) {
    tdLatest.innerHTML = `<span class="text-orange-600 font-semibold">${escHtml(pkg.latest)}</span>`;
  } else {
    tdLatest.innerHTML = `<span class="text-green-600">${escHtml(pkg.latest)}</span>`;
  }
  tr.appendChild(tdLatest);

  // ── Severity badge ──
  const tdSeverity = document.createElement('td');
  tdSeverity.className = 'td-cell text-center';
  tdSeverity.innerHTML = `
    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${s.badge}">
      ${escHtml(pkg.severity)}
    </span>`;
  tr.appendChild(tdSeverity);

  // ── Vuln count ──
  const tdVulns = document.createElement('td');
  tdVulns.className = 'td-cell text-center';
  if (pkg.vulns.length > 0) {
    const ids = pkg.vulns.map(v => v.id).join(', ');
    tdVulns.innerHTML = `
      <button
        class="vuln-count-btn inline-flex items-center justify-center w-7 h-7 rounded-full
               bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition-colors"
        title="${escHtml(ids)}"
        data-ids="${escHtml(ids)}"
      >${pkg.vulns.length}</button>`;
  } else {
    tdVulns.innerHTML = `<span class="text-gray-300">—</span>`;
  }
  tr.appendChild(tdVulns);

  // ── Links ──
  const tdLinks = document.createElement('td');
  tdLinks.className = 'td-cell';
  tdLinks.innerHTML = `
    <div class="flex items-center gap-2">
      <a href="https://pypi.org/project/${encodeURIComponent(pkg.name)}" target="_blank" rel="noopener"
         class="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2">PyPI</a>
      ${pkg.vulns.length > 0
        ? `<a href="https://osv.dev/list?q=${encodeURIComponent(pkg.name)}&ecosystem=PyPI" target="_blank" rel="noopener"
               class="text-xs text-red-500 hover:text-red-700 underline underline-offset-2">OSV</a>`
        : ''}
    </div>`;
  tr.appendChild(tdLinks);

  return tr;
}

/* ══════════════════════════════════════════════════════════════════
   DOWNLOAD UPDATED requirements.txt
══════════════════════════════════════════════════════════════════ */

/**
 * Generate and trigger download of an updated requirements.txt.
 * Only updates lines for packages that:
 *  - Were pinned with ==
 *  - Have a known latest version
 * Preserves comments, blank lines, and unpinned entries.
 */
function downloadUpdated() {
  // Build a lookup map: normalised name → latest version
  const latestMap = {};
  for (const r of results) {
    if (r.latest && r.latest !== 'unknown') {
      latestMap[r.name] = r.latest;
    }
  }

  const updatedLines = rawLines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) return line;

    // Re-parse this line to find the package name and see if it was ==pinned
    const parsed = parseRequirements(line);
    if (parsed.length === 0) return line;

    const { name, pinned } = parsed[0];
    if (!pinned) return line;  // not pinned — leave as-is

    const latest = latestMap[name];
    if (!latest) return line;  // unknown — leave as-is

    // Replace only the version number, preserve inline comments, extras, etc.
    return line.replace(
      /(==\s*)[\d.a-zA-Z+_-]+/,
      `==${latest}`
    );
  });

  const blob = new Blob([updatedLines.join('\n')], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'requirements.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Updated requirements.txt downloaded!', 'success');
}

/* ══════════════════════════════════════════════════════════════════
   UI HELPERS
══════════════════════════════════════════════════════════════════ */

/** Escape HTML special characters */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type]
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');

  const colourClass = {
    success: 'bg-green-600',
    error:   'bg-red-600',
    info:    'bg-gray-800',
  }[type] ?? 'bg-gray-800';

  toast.className = `pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl
                     text-white text-sm shadow-lg max-w-xs ${colourClass}
                     animate-slide-in`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}

/** Sync select-all checkbox state */
function syncSelectAll() {
  const checkboxes = [...resultsBody.querySelectorAll('.row-checkbox')];
  selectAll.checked       = checkboxes.length > 0 && checkboxes.every(c => c.checked);
  selectAll.indeterminate = !selectAll.checked && checkboxes.some(c => c.checked);
}

/** Reset the UI back to the upload state */
function resetUI() {
  results      = [];
  rawLines     = [];
  activeFilter = 'all';
  searchQuery  = '';
  sortState    = { col: 'severity', dir: 'asc' };

  resultsSection.classList.add('hidden');
  progressSection.classList.add('hidden');
  statsBar.classList.remove('flex');
  statsBar.classList.add('hidden');
  dropZone.classList.remove('hidden');

  fileInput.value = '';
  searchInput.value = '';

  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active-filter', b.dataset.filter === 'all');
  });
}

/* ══════════════════════════════════════════════════════════════════
   FILE HANDLING
══════════════════════════════════════════════════════════════════ */

/**
 * Main entry point when a file is provided (drag-drop or input).
 * @param {File|null} file
 */
async function handleFile(file) {
  if (!file) return;

  // Validate file type loosely (name ends with .txt or MIME is text)
  if (!file.name.endsWith('.txt') && !file.type.startsWith('text/')) {
    showToast('Please provide a .txt file (requirements.txt)', 'error');
    return;
  }

  const text = await file.text();
  await handleText(text);
}

/**
 * Entry point when raw text is available (from file or sample).
 * @param {string} text
 */
async function handleText(text) {
  rawLines = text.split('\n');
  const packages = parseRequirements(text);

  if (packages.length === 0) {
    showToast('No packages found in file. Is this a valid requirements.txt?', 'error');
    return;
  }

  dropZone.classList.add('hidden');
  await checkPackages(packages);
}

/* ══════════════════════════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════════════════════════ */

// ── Drag & drop ──────────────────────────────────────────────────
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', e => {
  if (!dropZone.contains(e.relatedTarget)) {
    dropZone.classList.remove('drag-over');
  }
});

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0] ?? null;
  handleFile(file);
});

// ── File input ───────────────────────────────────────────────────
fileInput.addEventListener('change', () => {
  handleFile(fileInput.files?.[0] ?? null);
});

// ── Sample button ────────────────────────────────────────────────
sampleBtn.addEventListener('click', e => {
  e.stopPropagation();   // prevent triggering the file input
  handleText(SAMPLE_REQUIREMENTS);
});

// ── Filter buttons ───────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active-filter', b === btn);
    });
    renderTable();
  });
});

// ── Search ───────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  renderTable();
});

// ── Sort (click on <th>) ─────────────────────────────────────────
document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (sortState.col === col) {
      sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
    } else {
      sortState.col = col;
      sortState.dir = 'asc';
    }
    renderTable();
  });
});

// ── Select all ───────────────────────────────────────────────────
selectAll.addEventListener('change', () => {
  const visible = getVisibleResults();
  visible.forEach(pkg => { pkg.selected = selectAll.checked; });
  renderTable();
});

// ── Download ─────────────────────────────────────────────────────
downloadBtn.addEventListener('click', downloadUpdated);

// ── Reset ────────────────────────────────────────────────────────
resetBtn.addEventListener('click', resetUI);

// ── Vuln tooltip (click on the vuln count badge) ─────────────────
resultsBody.addEventListener('click', e => {
  const btn = e.target.closest('.vuln-count-btn');
  if (!btn) return;
  const ids = btn.dataset.ids;
  showToast(`Vulnerabilities: ${ids}`, 'error');
});

// ── Prevent drop zone click propagation from sample button ───────
// (already handled with e.stopPropagation above)

/* ══════════════════════════════════════════════════════════════════
   TYPEDEFS (JSDoc only, no runtime effect)
══════════════════════════════════════════════════════════════════ */

/**
 * @typedef {object} PackageResult
 * @property {string}   name      Normalised package name
 * @property {string|null} pinned Pinned version from requirements.txt (== only)
 * @property {string}   latest   Latest version from PyPI
 * @property {string}   summary  One-line package description
 * @property {string}   homePage Project URL
 * @property {object[]} vulns    OSV vulnerability objects
 * @property {string}   severity Computed severity level
 * @property {string}   raw      Original line from requirements.txt
 * @property {boolean}  selected Whether the row checkbox is checked
 */
