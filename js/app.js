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
  fetchVerilatorInfo();
  fetchUvmInfo();
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

  // On mobile: show Theory first so user reads the explanation before coding
  if (window.innerWidth <= 768) mobTab('theory');
}

function goHome() {
  $('lesson-page').style.display  = 'none';
  $('landing-page').style.display = 'flex';
  buildLandingPage(); // refresh progress
}

// ── MOBILE TAB SWITCHING ──────────────────────────────────────────────────────
function mobTab(tab) {
  if (window.innerWidth > 768) return;
  ['lesson-sidebar', 'theory-pane', 'editor-pane', 'output-pane'].forEach(cls => {
    document.querySelector('.' + cls).classList.remove('mob-active');
  });
  document.querySelectorAll('.mob-tab').forEach(t => t.classList.remove('active'));
  const map = {
    lessons: ['lesson-sidebar', 'mob-tab-lessons'],
    theory:  ['theory-pane',    'mob-tab-theory'],
    code:    ['editor-pane',    'mob-tab-code'],
    output:  ['output-pane',    'mob-tab-output'],
  };
  if (map[tab]) {
    document.querySelector('.' + map[tab][0]).classList.add('mob-active');
    $(map[tab][1]).classList.add('active');
  }
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

  // hint — HTML-escape code content and wrap in <pre> to preserve whitespace
  const escapedHint = lesson.hint
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hintWrap = document.createElement('div');
  hintWrap.innerHTML = `
    <button class="hint-toggle" onclick="toggleHint()">💡 Show Hint</button>
    <div class="hint-box" id="hint-box"><pre class="hint-pre">${escapedHint}</pre></div>
  `;
  $('theory-content').appendChild(hintWrap);
  STATE.hintVisible = false;

  // On mobile: inject a "💻 Code →" shortcut into the theory pane header
  if (window.innerWidth <= 768) {
    const hdr = document.querySelector('.theory-pane .pane-header');
    if (hdr && !hdr.querySelector('.mob-code-shortcut')) {
      const codeBtn = document.createElement('button');
      codeBtn.className = 'mob-code-shortcut';
      codeBtn.textContent = '💻 Code →';
      codeBtn.onclick = () => mobTab('code');
      hdr.appendChild(codeBtn);
    }
  }
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

  // collect verilator flags from GUI panel (or empty for iverilog)
  const extraFlags = (tool === 'verilator') ? getVerilatorFlags() : [];

  const useUvm  = tool === 'verilator' && $('vf-uvm') && $('vf-uvm').checked;
  const uvmTest = useUvm ? ($('vf-uvm-test').value.trim()) : '';
  const uvmVerb = useUvm ? ($('vf-uvm-verb').value || 'UVM_MEDIUM') : 'UVM_MEDIUM';

  // UI: running state
  const runLabel = useUvm ? '⏳ Compiling UVM…' : 'Running...';
  btn.disabled = true;
  btn.innerHTML = `<svg viewBox="0 0 10 10" style="fill:var(--bg)"><polygon points="1,0 10,5 1,10"/></svg> ${runLabel}`;
  pill.className = 'status-pill run';
  pill.textContent = 'running';
  $('result-banner').className = 'result-banner';
  clearConsole();

  const isLintOnly = extraFlags.includes('--lint-only');
  const flagsLabel = tool === 'verilator'
    ? `verilator --cc --sv --trace ${extraFlags.join(' ')} design.sv tb.sv`
    : `iverilog -g2012 design.v testbench.v`;
  addConsoleLine(`$ ${flagsLabel}`, 'o-info');
  if (useUvm) {
    addConsoleLine('// UVM mode — compiling uvm_pkg.sv (~1–3 min first run)', 'o-dim');
    if (uvmTest) addConsoleLine(`// +UVM_TESTNAME=${uvmTest}  +UVM_VERBOSITY=${uvmVerb}`, 'o-dim');
  }
  markTask(0, true);

  try {
    const res = await fetch('/simulate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        design: designCode, testbench: tbCode, tool,
        extra_flags: extraFlags,
        use_uvm: useUvm,
        uvm_test: uvmTest,
        uvm_verbosity: uvmVerb,
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.success) {
      pill.className   = 'status-pill err';
      pill.textContent = 'error';
      addConsoleLine('', '');
      addConsoleLine('Compilation error:', 'o-err');
      data.output.split('\n').forEach(l => {
        if (!l.trim()) return;
        // distinguish warnings vs errors for Verilator output
        const cls = (l.includes('%Warning') && !l.includes('%Error')) ? 'o-dim' : 'o-err';
        addConsoleLine(l, cls);
      });
      showBanner('fail', '✗ Compilation failed — fix errors above');
    } else {
      if (isLintOnly) {
        addConsoleLine('', '');
        data.output.split('\n').forEach(l => l.trim() && addConsoleLine(l, 'o-ok'));
        pill.className   = 'status-pill ok';
        pill.textContent = 'lint ok';
        showBanner('pass', '✓ Lint passed — no issues found');
        showToast('✓ Lint OK', 'info');
        btn.disabled  = false;
        btn.innerHTML = `<svg viewBox="0 0 10 10" style="fill:var(--bg)"><polygon points="1,0 10,5 1,10"/></svg> Run`;
        return;
      }
      addConsoleLine(`$ ${tool === 'verilator' ? './obj_dir/Vtb' : 'vvp sim'}`, 'o-info');
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

      // auto-switch to output on mobile
      if (window.innerWidth <= 768) mobTab('output');

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
  const btn = $('veri-opts-btn');
  if (isVeri) {
    btn.textContent = window.innerWidth <= 768 ? '⚙' : '⚙ Options';
    btn.style.display = 'inline-flex';
  } else {
    btn.style.display = 'none';
    closeVerilatorPanel();
  }
}

// ── VERILATOR OPTIONS PANEL ───────────────────────────────────────────────────
let _veriPanelOpen = false;

function toggleVerilatorPanel() {
  _veriPanelOpen ? closeVerilatorPanel() : openVerilatorPanel();
}

function openVerilatorPanel() {
  _veriPanelOpen = true;
  $('veri-panel').style.display    = 'block';
  $('veri-backdrop').style.display = 'block';
  $('veri-opts-btn').classList.add('active');
  updateFlagsPreview();
  fetchUvmInfo();   // refresh UVM availability every time the panel opens
}

function closeVerilatorPanel() {
  _veriPanelOpen = false;
  $('veri-panel').style.display    = 'none';
  $('veri-backdrop').style.display = 'none';
  $('veri-opts-btn').classList.remove('active');
}

function resetVerilatorOptions() {
  // Timing: back to --no-timing
  $('vf-no-timing').checked = true;
  $('vf-timing').checked    = false;
  // Warnings: all off
  ['vf-Wall','vf-Wnofatal','vf-WnoWIDTH','vf-WnoUNUSED',
   'vf-WnoUNDRIVEN','vf-WnoCASE','vf-WnoUNSIGNED'].forEach(id => {
    $(id).checked = false;
  });
  // Optimization: default
  $('vf-opt').value = '';
  // Features: all off
  $('vf-assert').checked    = false;
  $('vf-coverage').checked  = false;
  $('vf-lint-only').checked = false;
  // UVM: off
  $('vf-uvm').checked         = false;
  $('vf-uvm-test').value      = '';
  $('vf-uvm-verb').value      = 'UVM_MEDIUM';
  $('uvm-subopts').style.display = 'none';
  // Extra: clear
  $('vf-extra').value = '';
  updateFlagsPreview();
}

// ── UVM TOGGLE ────────────────────────────────────────────────────────────────
function onUvmToggle() {
  const on = $('vf-uvm').checked;
  $('uvm-subopts').style.display = on ? 'flex' : 'none';
  // UVM requires --timing; lock the radio when UVM is on
  if (on) {
    $('vf-timing').checked    = true;
    $('vf-no-timing').checked = false;
    $('vf-no-timing').disabled = true;
    $('vf-timing').disabled    = false;
  } else {
    $('vf-no-timing').disabled = false;
    $('vf-timing').disabled    = false;
  }
  updateFlagsPreview();
}

/** Read all panel controls and return an array of Verilator flag strings. */
function getVerilatorFlags() {
  const flags = [];

  // Timing
  const timingEl = document.querySelector('input[name="veri-timing"]:checked');
  if (timingEl) flags.push(timingEl.value);

  // Warnings
  const warnMap = {
    'vf-Wall':       '--Wall',
    'vf-Wnofatal':   '--Wno-fatal',
    'vf-WnoWIDTH':   '--Wno-WIDTH',
    'vf-WnoUNUSED':  '--Wno-UNUSED',
    'vf-WnoUNDRIVEN':'--Wno-UNDRIVEN',
    'vf-WnoCASE':    '--Wno-CASEINCOMPLETE',
    'vf-WnoUNSIGNED':'--Wno-UNSIGNED',
  };
  for (const [id, flag] of Object.entries(warnMap)) {
    if ($(id) && $(id).checked) flags.push(flag);
  }

  // Optimization
  const opt = $('vf-opt') && $('vf-opt').value;
  if (opt) flags.push(opt);

  // Features
  if ($('vf-assert')   && $('vf-assert').checked)   flags.push('--assert');
  if ($('vf-coverage') && $('vf-coverage').checked) flags.push('--coverage');
  if ($('vf-lint-only')&& $('vf-lint-only').checked)flags.push('--lint-only');

  // Extra free-form flags
  const extra = $('vf-extra') ? $('vf-extra').value.trim() : '';
  if (extra) flags.push(...extra.split(/\s+/).filter(f => f.startsWith('-')));

  return flags;
}

/** Live-update the flags preview bar inside the panel. */
function updateFlagsPreview() {
  const preview = $('veri-flags-preview');
  if (!preview) return;
  const flags = getVerilatorFlags();
  // Always show the fixed backend flags too for full transparency
  const allFlags = ['--cc','--exe','--build','--sv','--trace', ...flags];
  if (allFlags.length > 3) {
    preview.textContent = 'verilator ' + allFlags.join(' ');
    preview.classList.add('has-flags');
  } else {
    preview.textContent = '';
    preview.classList.remove('has-flags');
  }
}

// Wire up live preview updates whenever any option changes
document.addEventListener('DOMContentLoaded', () => {
  const panelInputs = [
    'vf-no-timing','vf-timing','vf-Wall','vf-Wnofatal',
    'vf-WnoWIDTH','vf-WnoUNUSED','vf-WnoUNDRIVEN','vf-WnoCASE','vf-WnoUNSIGNED',
    'vf-opt','vf-assert','vf-coverage','vf-lint-only',
    'vf-uvm','vf-uvm-test','vf-uvm-verb',
    'vf-extra',
  ];
  panelInputs.forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('change', updateFlagsPreview);
    if (el) el.addEventListener('input',  updateFlagsPreview);
  });
});

// ── VERILATOR VERSION BADGE ───────────────────────────────────────────────────
async function fetchVerilatorInfo() {
  try {
    const r = await fetch('/verilator-info');
    if (!r.ok) return;
    const info = await r.json();
    const badge = $('veri-ver-badge');
    if (!badge) return;
    if (!info.available) {
      badge.textContent = 'not installed';
      badge.style.background = 'rgba(247,111,111,0.12)';
      badge.style.color = 'var(--warn)';
    } else {
      const ver = info.version || 'unknown';
      badge.textContent = ver.replace('Verilator ','v').split(' ')[0];
      if (info.major >= 5) {
        badge.style.background = 'rgba(79,219,143,0.12)';
        badge.style.color = 'var(--success)';
      }
    }
  } catch (_) { /* ignore */ }
}

// ── UVM AVAILABILITY CHECK ────────────────────────────────────────────────────
async function fetchUvmInfo() {
  try {
    const r = await fetch('/uvm-info');
    if (!r.ok) return;
    const info = await r.json();
    const unavailMsg  = $('uvm-unavail-msg');
    const toggleRow   = $('uvm-toggle-row');
    const uvmCheckbox = $('vf-uvm');
    if (!unavailMsg) return;
    if (!info.available) {
      // UVM library not on server — show warning, disable checkbox
      unavailMsg.style.display = 'block';
      unavailMsg.textContent   = `⚠ UVM library not found — ${info.reason}`;
      if (uvmCheckbox)  uvmCheckbox.disabled = true;
      if (toggleRow)    toggleRow.style.opacity = '0.45';
    } else {
      unavailMsg.style.display = 'none';
      if (uvmCheckbox) uvmCheckbox.disabled = false;
      if (toggleRow)   toggleRow.style.opacity = '';
    }
  } catch (_) { /* ignore — server may not have the endpoint yet */ }
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
