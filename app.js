
let db = null;
let currentTab = 'dict';

const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const qEl = document.getElementById('q');

// Tabs
for (const el of document.querySelectorAll('.tab')) {
  el.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    currentTab = el.dataset.tab;
    doSearch();
  });
}

document.getElementById('btnSearch').addEventListener('click', () => doSearch());
document.getElementById('btnClear').addEventListener('click', () => { qEl.value=''; resultsEl.innerHTML=''; qEl.focus(); });

qEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

async function initDb() {
  setStatus('正在加载数据库与 SQL 引擎（首次需联网）…');
  const SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });
  const resp = await fetch('assets/basic_lang_core_v1.sqlite');
  const buf = await resp.arrayBuffer();
  db = new SQL.Database(new Uint8Array(buf));
  setStatus('数据库已加载');
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function escHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderDict(rows) {
  if (!rows.length) return '<div class="meta">无结果</div>';
  return rows.map(r => {
    const hw = escHtml(r.headword || '');
    const pos = escHtml(r.pos || '');
    const zh = escHtml(r.gloss_zh || '');
    const en = escHtml(r.gloss_en || '');
    const ex = escHtml(r.example_es || '');
    const exzh = escHtml(r.example_zh || '');
    return `<div class="result">
      <div><strong>${hw}</strong> <small class="badge">${pos || '—'}</small></div>
      <div>${zh}${en ? ' · '+en : ''}</div>
      ${ex || exzh ? `<div class="meta">${ex}${exzh ? ' ｜ '+exzh : ''}</div>` : ''}
    </div>`;
  }).join('');
}

function renderGrammar(rows) {
  if (!rows.length) return '<div class="meta">无结果</div>';
  return rows.map(r => {
    const code = escHtml(r.code || '');
    const cefr = escHtml(r.cefr || '');
    const te = escHtml(r.title_es || '');
    const tz = escHtml(r.title_zh || '');
    return `<div class="result">
      <div><strong>${code}</strong> <small class="badge">${cefr}</small></div>
      <div>${te} ｜ ${tz}</div>
    </div>`;
  }).join('');
}

function selectAll(stmt) {
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function doSearch() {
  if (!db) return;
  const q = qEl.value.trim();
  if (!q) { resultsEl.innerHTML = '<div class="meta">请输入关键词</div>'; return; }

  const like = `%${q}%`;
  try {
    if (currentTab === 'dict') {
      const stmt = db.prepare(`
        SELECT headword, pos, gloss_zh, gloss_en, example_es, example_zh
        FROM dict_entries
        WHERE headword LIKE ? OR gloss_zh LIKE ? OR gloss_en LIKE ?
        LIMIT 50
      `);
      stmt.bind([like, like, like]);
      const rows = selectAll(stmt);
      resultsEl.innerHTML = renderDict(rows);
      setStatus(`词典结果：${rows.length} 条`);
    } else {
      const stmt = db.prepare(`
        SELECT code, cefr, title_es, title_zh
        FROM grammar_points
        WHERE title_es LIKE ? OR title_zh LIKE ? OR rule_zh LIKE ?
        LIMIT 50
      `);
      stmt.bind([like, like, like]);
      const rows = selectAll(stmt);
      resultsEl.innerHTML = renderGrammar(rows);
      setStatus(`语法结果：${rows.length} 条`);
    }
  } catch (err) {
    console.error(err);
    setStatus('查询出错：' + err.message);
  }
}

initDb().then(() => {
  qEl.focus();
}).catch(err => {
  console.error(err);
  setStatus('初始化失败：' + err.message);
});
