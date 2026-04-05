// ═══════════════════════════════════════════════════════
// app.js — All About VLSI Main Application
// ═══════════════════════════════════════════════════════

// ── STATE ────────────────────────────────────────────────────────────────────
const STATE = {
  page:           'landing',   // 'landing' | 'lesson'
  currentModule:  null,
  currentLesson:  null,
  activeTab:      'design',    // 'design' | 'tb'
  editorCache:    {},          // key: `${modId}-${lessonId}-${tab}` -> content
  completed:      new Set(JSON.parse(localStorage.getItem('aavlsi_done') || '[]')),
  hintVisible:    false,
};

// ── LOCAL STORAGE HELPERS ────────────────────────────────────────────────────
const LS_CODE = 'aavlsi_code_';   // prefix for saved editor content

function lsGet(key) {
  try { return localStorage.getItem(LS_CODE + key) || null; } catch(e) { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(LS_CODE + key, val); } catch(e) { /* storage full */ }
}

// ── DOM REFS ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  buildLandingPage();
  Waveform.init($('wave-canvas'), $('wave-scroll'));
  Waveform.clear();

  // editor events
  $('editor-design').addEventListener('input', () => onEditorInput('design'));
  $('editor-tb').addEventListener('input',     () => onEditorInput('tb'));
  $('editor-design').addEventListener('keydown', tabKey);
  $('editor-tb').addEventListener('keydown',     tabKey);

  pingServer();
});

// ── LANDING PAGE ─────────────────────────────────────────────────────────────
function buildLandingPage() {
  const grid = $('modules-grid');
  grid.innerHTML = '';

  CURRICULUM.forEach(mod => {
    const done   = mod.lessons.filter(l => STATE.completed.has(l.id)).length;
    const total  = mod.lessons.length;
    const pct    = total ? Math.round((done / total) * 100) : 0;

    const card = document.createElement('div');
    card.className = `module-card ${mod.level}`;
    card.innerHTML = `
      <div class="card-icon">${mod.icon}</div>
      <div class="card-title">${mod.title}</div>
      <div class="card-meta">
        <span class="level-pill ${mod.level}">${mod.level}</span>
        <span class="card-lesson-count">${total} lessons</span>
      </div>
      <div class="card-progress">
        <div class="card-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="card-start-hint">${done}/${total} complete${pct>0?' · '+pct+'%':''}</div>
    `;
    card.addEventListener('click', () => openModule(mod.id));
    grid.appendChild(card);
  });
}

// ── PAGE NAVIGATION ───────────────────────────────────────────────────────────
function openModule(modId) {
  const mod = CURRICULUM.find(m => m.id === modId);
  if (!mod) return;
  const firstLesson = mod.lessons[0];
  openLesson(modId, firstLesson.id);
}

function openLesson(modId, lessonId) {
  const mod    = CURRICULUM.find(m => m.id === modId);
  const lesson = mod?.lessons.find(l => l.id === lessonId);
  if (!mod || !lesson) return;

  STATE.currentModule = modId;
  STATE.currentLesson = lessonId;
  STATE.hintVisible   = false;

  $('landing-page').style.display = 'none';
  $('lesson-page').style.display  = 'flex';

  renderSidebar(mod, lessonId);
  renderTheory(lesson);
  loadEditors(mod.id, lesson);
  renderProgressDots(mod, lessonId);
  updateNavButtons();
  clearConsole();
  Waveform.clear();

  $('lesson-nav-title').textContent = lesson.title;
  $('result-banner').className = 'result-banner';
  $('result-banner').textContent = '';
}

function goHome() {
  $('lesson-page').style.display  = 'none';
  $('landing-page').style.display = 'flex';
  buildLandingPage(); // refresh progress
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function renderSidebar(mod, activeLessonId) {
  $('sidebar-mod-title').textContent = `${mod.icon} ${mod.title}`;

  const list = $('sidebar-lessons');
  list.innerHTML = '';

  mod.lessons.forEach((lesson, idx) => {
    const done   = STATE.completed.has(lesson.id);
    const active = lesson.id === activeLessonId;

    const item = document.createElement('div');
    item.className = `sidebar-lesson ${active ? 'active' : ''} ${done && !active ? 'done' : ''}`;
    item.innerHTML = `
      <div class="lesson-num">${done ? '✓' : idx + 1}</div>
      <span>${lesson.title}</span>
    `;
    item.addEventListener('click', () => openLesson(mod.id, lesson.id));
    list.appendChild(item);
  });

  // progress footer
  const done  = mod.lessons.filter(l => STATE.completed.has(l.id)).length;
  const total = mod.lessons.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  $('sidebar-prog-label').textContent = `${done}/${total} lessons`;
  $('sidebar-prog-pct').textContent   = `${pct}%`;
  $('sidebar-prog-fill').style.width  = pct + '%';
}

// ── THEORY PANE ───────────────────────────────────────────────────────────────
function renderTheory(lesson) {
  $('theory-content').innerHTML = lesson.theory;

  // tasks
  const tasksEl = document.createElement('div');
  tasksEl.className = 'tasks-box';
  tasksEl.innerHTML = `<div class="tasks-title">✏ Your Tasks</div>` +
    lesson.tasks.map((t, i) => `
      <div class="task-item" id="task-${i}">
        <div class="task-check"></div>
        <span>${t}</span>
      </div>`).join('');
  $('theory-content').appendChild(tasksEl);

  // hint
  const hintWrap = document.createElement('div');
  hintWrap.innerHTML = `
    <button class="hint-toggle" onclick="toggleHint()">💡 Show Hint</button>
    <div class="hint-box" id="hint-box">${lesson.hint}</div>
  `;
  $('theory-content').appendChild(hintWrap);
  STATE.hintVisible = false;
}

function toggleHint() {
  STATE.hintVisible = !STATE.hintVisible;
  const box = $('hint-box');
  if (box) box.classList.toggle('show', STATE.hintVisible);
}

// ── EDITORS ───────────────────────────────────────────────────────────────────
function loadEditors(modId, lesson) {
  const designKey = `${modId}-${lesson.id}-design`;
  const tbKey     = `${modId}-${lesson.id}-tb`;

  // Priority: localStorage (persists across reloads) → in-memory cache → lesson default
  STATE.editorCache[designKey] = lsGet(designKey) || STATE.editorCache[designKey] || lesson.design;
  STATE.editorCache[tbKey]     = lsGet(tbKey)     || STATE.editorCache[tbKey]     || lesson.testbench;

  $('editor-design').value = STATE.editorCache[designKey];
  $('editor-tb').value     = STATE.editorCache[tbKey];

  syncLineNums('design');
  syncLineNums('tb');

  // show design tab by default
  switchEditorTab('design');
}

function switchEditorTab(tab) {
  STATE.activeTab = tab;
  $('tab-design').classList.toggle('active', tab === 'design');
  $('tab-tb').classList.toggle('active',     tab === 'tb');
  $('editor-design').style.display = tab === 'design' ? 'block' : 'none';
  $('lnum-design').style.display   = tab === 'design' ? 'block' : 'none';
  $('editor-tb').style.display     = tab === 'tb'     ? 'block' : 'none';
  $('lnum-tb').style.display       = tab === 'tb'     ? 'block' : 'none';
}

function onEditorInput(tab) {
  const mod    = CURRICULUM.find(m => m.id === STATE.currentModule);
  const lesson = mod?.lessons.find(l => l.id === STATE.currentLesson);
  if (!lesson) return;
  const key = `${STATE.currentModule}-${STATE.currentLesson}-${tab}`;
  STATE.editorCache[key] = $(`editor-${tab}`).value;
  lsSet(key, STATE.editorCache[key]);   // persist across reloads
  syncLineNums(tab);
}

function syncLineNums(tab) {
  const ta  = $(`editor-${tab}`);
  const ln  = $(`lnum-${tab}`);
  const n   = ta.value.split('\n').length;
  ln.innerHTML = Array.from({length: n}, (_, i) => `<span>${i+1}</span>`).join('');

  // sync scroll
  ta.addEventListener('scroll', () => { ln.scrollTop = ta.scrollTop; }, { once: false });
}

function tabKey(e) {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const ta = e.target;
  const s  = ta.selectionStart;
  ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd);
  ta.selectionStart = ta.selectionEnd = s + 2;
  onEditorInput(ta.id === 'editor-design' ? 'design' : 'tb');
}

// ── NAVIGATION ───────────────────────────────────────────────────────────────
function renderProgressDots(mod, activeLessonId) {
  const dots = $('progress-dots');
  dots.innerHTML = '';
  mod.lessons.forEach(lesson => {
    const dot  = document.createElement('div');
    const done = STATE.completed.has(lesson.id);
    dot.className = `pdot ${done ? 'done' : ''} ${lesson.id === activeLessonId ? 'active' : ''}`;
    dot.title     = lesson.title;
    dot.addEventListener('click', () => openLesson(mod.id, lesson.id));
    dots.appendChild(dot);
  });
}

function updateNavButtons() {
  const mod     = CURRICULUM.find(m => m.id === STATE.currentModule);
  if (!mod) return;
  const lessons = mod.lessons;
  const idx     = lessons.findIndex(l => l.id === STATE.currentLesson);

  $('btn-prev').disabled = idx <= 0;
  $('btn-next').disabled = idx >= lessons.length - 1;
  $('btn-next-lesson').disabled = idx >= lessons.length - 1;
}

function navPrev() {
  const mod     = CURRICULUM.find(m => m.id === STATE.currentModule);
  if (!mod) return;
  const idx     = mod.lessons.findIndex(l => l.id === STATE.currentLesson);
  if (idx > 0) openLesson(mod.id, mod.lessons[idx - 1].id);
}

function navNext() {
  const mod     = CURRICULUM.find(m => m.id === STATE.currentModule);
  if (!mod) return;
  const idx     = mod.lessons.findIndex(l => l.id === STATE.currentLesson);
  if (idx < mod.lessons.length - 1) openLesson(mod.id, mod.lessons[idx + 1].id);
}

// ── SIMULATION ────────────────────────────────────────────────────────────────
async function runSimulation() {
  const mod    = CURRICULUM.find(m => m.id === STATE.currentModule);
  const lesson = mod?.lessons.find(l => l.id === STATE.currentLesson);
  if (!lesson) return;

  const btn    = $('run-btn');
  const pill   = $('status-pill');
  const tool   = $('sim-select').value;

  const designCode = STATE.editorCache[`${STATE.currentModule}-${STATE.currentLesson}-design`] || lesson.design;
  const tbCode     = STATE.editorCache[`${STATE.currentModule}-${STATE.currentLesson}-tb`]     || lesson.testbench;

  // collect extra verilator flags from the flags input
  const extraFlags = (tool === 'verilator')
    ? ($('verilator-flags').value.trim().split(/\s+/).filter(Boolean))
    : [];

  // UI: running state
  btn.disabled = true;
  btn.innerHTML = `<svg viewBox="0 0 10 10" style="fill:var(--bg)"><polygon points="1,0 10,5 1,10"/></svg> Running...`;
  pill.className = 'status-pill run';
  pill.textContent = 'running';
  $('result-banner').className = 'result-banner';
  clearConsole();

  const flagsLabel = tool === 'verilator'
    ? `verilator --sv ${extraFlags.join(' ')} design.sv tb.sv`
    : `iverilog -g2012 design.v testbench.v`;
  addConsoleLine(`$ ${flagsLabel}`, 'o-info');
  markTask(0, true);

  try {
    const res = await fetch('/simulate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ design: designCode, testbench: tbCode, tool, extra_flags: extraFlags })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.success) {
      pill.className   = 'status-pill err';
      pill.textContent = 'error';
      addConsoleLine('', '');
      addConsoleLine('Compilation error:', 'o-err');
      data.output.split('\n').forEach(l => l.trim() && addConsoleLine(l, 'o-err'));
      showBanner('fail', '✗ Compilation failed — fix errors above');
    } else {
      addConsoleLine(`$ vvp sim`, 'o-info');
      addConsoleLine('', '');

      data.output.split('\n').forEach(line => {
        if (!line.trim()) return;
        const isFinish = line.includes('$finish') || line.includes('Finished');
        addConsoleLine(line, isFinish ? 'o-dim' : 'o-ok');
      });

      pill.className   = 'status-pill ok';
      pill.textContent = 'passed';
      markTask(1, true);

      // check expected outputs
      const allPass = lesson.expected.every(ex => data.output.includes(ex));
      if (allPass) {
        markTask(2, true);
        markComplete(lesson.id);
        showBanner('pass', '✓ All checks passed! Lesson complete.');
        showToast('🎉 Lesson complete!', 'pass');
      } else {
        showBanner('pass', '✓ Simulation ran successfully');
        showToast('✓ Simulation complete', 'info');
      }

      // render waveform
      if (data.vcd && data.vcd.trim()) {
        const parsed = Waveform.parseVCD(data.vcd);
        Waveform.render(parsed);
        $('wave-info').textContent = `${Object.keys(parsed.signals).length} signals`;
      }
    }

  } catch (err) {
    pill.className   = 'status-pill err';
    pill.textContent = 'error';
    addConsoleLine('', '');
    addConsoleLine('Cannot reach backend: ' + err.message, 'o-err');
    addConsoleLine('Run: uvicorn main:app --reload', 'o-dim');
    showBanner('fail', '✗ Backend not reachable');
  }

  $('console-output').scrollTop = $('console-output').scrollHeight;
  btn.disabled  = false;
  btn.innerHTML = `<svg viewBox="0 0 10 10" style="fill:var(--bg)"><polygon points="1,0 10,5 1,10"/></svg> Run`;
}

// ── CONSOLE ───────────────────────────────────────────────────────────────────
function clearConsole() {
  const out = $('console-output');
  out.innerHTML = '';
  addConsoleLine('// Console ready. Hit ▶ Run to simulate.', 'o-info');
  addConsoleLine('', '');
}

function addConsoleLine(text, cls) {
  const out  = $('console-output');
  const span = document.createElement('span');
  if (cls) span.className = cls;
  span.textContent = text;
  out.appendChild(span);
  out.appendChild(document.createTextNode('\n'));
}

// ── TASKS & COMPLETION ────────────────────────────────────────────────────────
function markTask(idx, done) {
  const el  = document.getElementById(`task-${idx}`);
  if (!el) return;
  el.classList.toggle('done', done);
  const check = el.querySelector('.task-check');
  if (check) check.textContent = done ? '✓' : '';
}

function markComplete(lessonId) {
  STATE.completed.add(lessonId);
  localStorage.setItem('aavlsi_done', JSON.stringify([...STATE.completed]));
  // refresh sidebar dots
  const mod = CURRICULUM.find(m => m.id === STATE.currentModule);
  if (mod) {
    renderSidebar(mod, STATE.currentLesson);
    renderProgressDots(mod, STATE.currentLesson);
  }
}

// ── BANNER / TOAST ────────────────────────────────────────────────────────────
function showBanner(type, msg) {
  const b = $('result-banner');
  b.className   = `result-banner ${type}`;
  b.textContent = msg;
}

function showToast(msg, type = 'pass') {
  const t = $('toast');
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── WAVEFORM CONTROLS ─────────────────────────────────────────────────────────
function waveZoomIn()  { Waveform.zoomIn(); }
function waveZoomOut() { Waveform.zoomOut(); }
function waveFit()     { Waveform.zoomFit(); }

function toggleWaveExpand() {
  const pane = $('output-pane');
  pane.classList.toggle('expanded');
  $('wave-expand-btn').textContent = pane.classList.contains('expanded') ? '⟨ shrink' : '⟩ expand';
  Waveform.draw();
}

// ── SIM SELECT ───────────────────────────────────────────────────────────────
function onSimSelectChange() {
  const isVeri = $('sim-select').value === 'verilator';
  $('verilator-flags').style.display = isVeri ? 'inline-block' : 'none';
}

// ── FEEDBACK ─────────────────────────────────────────────────────────────────
let _fbRating = 0;

function openFeedback() {
  // label which lesson the feedback is about
  const mod    = CURRICULUM.find(m => m.id === STATE.currentModule);
  const lesson = mod?.lessons.find(l => l.id === STATE.currentLesson);
  const label  = lesson ? `${mod.title} › ${lesson.title}` : '';
  $('feedback-lesson-label').textContent = label;

  _fbRating = 0;
  $('feedback-comment').value = '';
  updateStars(0);

  $('feedback-overlay').style.display = 'block';
  $('feedback-modal').style.display   = 'flex';
}

function closeFeedback() {
  $('feedback-overlay').style.display = 'none';
  $('feedback-modal').style.display   = 'none';
}

function setRating(n) {
  _fbRating = n;
  updateStars(n);
}

function updateStars(n) {
  $('feedback-stars').querySelectorAll('span').forEach((s, i) => {
    s.classList.toggle('active', i < n);
  });
}

async function submitFeedback() {
  const comment = $('feedback-comment').value.trim();
  if (!_fbRating && !comment) { closeFeedback(); return; }
  try {
    await fetch('/feedback', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        lesson_id: STATE.currentLesson || '',
        module_id: STATE.currentModule || '',
        rating:    _fbRating,
        comment,
      }),
    });
    showToast('Thanks for the feedback! 🙏', 'pass');
  } catch (e) {
    showToast('Could not send feedback', 'err');
  }
  closeFeedback();
}

// ── SERVER PING ───────────────────────────────────────────────────────────────
async function pingServer() {
  try {
    const r = await fetch('/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ design: 'module x; endmodule', testbench: 'module tb; initial $finish; endmodule' })
    });
    $('server-status').textContent = r.ok ? '● server online' : '● server error';
    $('server-status').style.color = r.ok ? 'var(--success)' : 'var(--warn)';
  } catch {
    $('server-status').textContent = '● no server';
    $('server-status').style.color = 'var(--warn)';
  }
}
