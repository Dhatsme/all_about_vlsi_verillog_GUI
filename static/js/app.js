// ═══════════════════════════════════════════════════════
// app.js — All About VLSI Main Application
// ═══════════════════════════════════════════════════════

// ── STATE ────────────────────────────────────────────────────────────────────────────
const STATE = {
  page:           'landing',   // 'landing' | 'lesson'
  currentModule:  null,
  currentLesson:  null,
  activeTab:      'design',    // 'design' | 'tb'
  editorCache:    {},          // key: `${modId}-${lessonId}-${tab}` -> content
  completed:      new Set(JSON.parse(localStorage.getItem('aavlsi_done') || '[]')),
  hintVisible:    false,
};

// ── LOCAL STORAGE HELPERS ────────────────────────────────────────────────────────────────────────
const LS_CODE = 'aavlsi_code_';   // prefix for saved editor content

function lsGet(key) {
  try { return localStorage.getItem(LS_CODE + key) || null; } catch(e) { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(LS_CODE + key, val); } catch(e) { /* storage full */ }
}

// ── DOM REFS ──────────────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── COURSE HELPERS ────────────────────────────────────────────────────────────────────────────
function getCourseForModule(modId) {
  return (window.COURSES || []).find(c => c.modules.includes(modId));
}

function openCourse(courseId) {
  const course = (window.COURSES || []).find(c => c.id === courseId);
  if (!course) return;
  const courseModules = course.modules.map(id => CURRICULUM.find(m => m.id === id)).filter(Boolean);
  if (!courseModules.length) return;

  const total = courseModules.reduce((s, m) => s + m.lessons.length, 0);
  const done  = courseModules.reduce((s, m) => s + m.lessons.filter(l => STATE.completed.has(l.id)).length, 0);

  if (done >= total && total > 0) {
    showCertificate(course, courseModules);
    return;
  }

  // Find first incomplete lesson
  for (const mod of courseModules) {
    for (const lesson of mod.lessons) {
      if (!STATE.completed.has(lesson.id)) {
        openLesson(mod.id, lesson.id);
        return;
      }
    }
  }
  openLesson(courseModules[0].id, courseModules[0].lessons[0].id);
}

// ── INIT ────────────────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  buildLandingPage();
  Waveform.init($('wave-canvas'), $('wave-scroll'));
  Waveform.clear();

  $('editor-design').addEventListener('input', () => onEditorInput('design'));
  $('editor-tb').addEventListener('input',     () => onEditorInput('tb'));
  $('editor-design').addEventListener('keydown', tabKey);
  $('editor-tb').addEventListener('keydown',     tabKey);

  pingServer();
  fetchVerilatorInfo();
  fetchUvmInfo();
});

// ── LANDING PAGE ────────────────────────────────────────────────────────────────────────────
function buildLandingPage() {
  const grid = $('modules-grid');
  grid.innerHTML = '';

  const courses = window.COURSES || [];
  const courseModuleIds = new Set(courses.flatMap(c => c.modules));

  // Render master courses first (full-width cards)
  courses.forEach(course => {
    const courseModules = course.modules
      .map(id => CURRICULUM.find(m => m.id === id))
      .filter(Boolean);

    const totalLessons = courseModules.reduce((s, m) => s + m.lessons.length, 0);
    const doneLessons  = courseModules.reduce((s, m) =>
      s + m.lessons.filter(l => STATE.completed.has(l.id)).length, 0);
    const pct = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0;
    const estHours = Math.ceil(totalLessons * 20 / 60);

    const isComplete = pct === 100 && totalLessons > 0;
    const startLabel = isComplete ? '🏆 View Certificate' : pct > 0 ? '▶ Continue' : '▶ Start Course';

    const card = document.createElement('div');
    card.className = 'course-card';
    card.innerHTML = `
      <div class="course-header" onclick="openCourse('${course.id}')">
        <div class="course-icon">${course.icon}</div>
        <div class="course-info">
          <div class="course-title">${course.title}</div>
          <div class="course-desc">${course.description}</div>
          <div class="course-meta">
            <span>${totalLessons} lessons</span>
            <span class="meta-dot">·</span>
            <span>${courseModules.length} chapters</span>
            <span class="meta-dot">·</span>
            <span>~${estHours} hrs</span>
            <span class="meta-dot">·</span>
            <span class="${pct > 0 ? 'meta-progress' : ''}">${pct > 0 ? pct + '% complete' : 'Not started'}</span>
          </div>
        </div>
        <button class="course-start-btn" onclick="event.stopPropagation(); openCourse('${course.id}')">${startLabel}</button>
      </div>
      <div class="course-progress-bar">
        <div class="course-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="course-chapters">
        ${courseModules.length === 0
          ? '<div style="color:var(--muted);font-size:0.8rem;padding:8px 0;">Chapters loading… refresh if this persists.</div>'
          : courseModules.map((mod, i) => {
              const done  = mod.lessons.filter(l => STATE.completed.has(l.id)).length;
              const total = mod.lessons.length;
              return `<button class="chapter-chip ${mod.level || 'beginner'}" onclick="openModule('${mod.id}')">
                <span class="chapter-num">${String(i + 1).padStart(2, '0')}</span>
                <span class="chapter-icon">${mod.icon || '📘'}</span>
                <span class="chapter-name">${mod.title || 'Chapter ' + (i + 1)}</span>
                <span class="chapter-count">${done}/${total}</span>
              </button>`;
            }).join('')
        }
      </div>
    `;
    grid.appendChild(card);
  });

  // Render standalone modules (not part of any course)
  const standaloneModules = CURRICULUM.filter(m => !courseModuleIds.has(m.id));

  if (standaloneModules.length && courses.length) {
    const divider = document.createElement('div');
    divider.className = 'section-divider';
    divider.textContent = 'Advanced Modules';
    grid.appendChild(divider);
  }

  standaloneModules.forEach(mod => {
    const done  = mod.lessons.filter(l => STATE.completed.has(l.id)).length;
    const total = mod.lessons.length;
    const pct   = total ? Math.round((done / total) * 100) : 0;

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
      <div class="card-start-hint">${done}/${total} complete${pct > 0 ? ' · ' + pct + '%' : ''}</div>
    `;
    card.addEventListener('click', () => openModule(mod.id));
    grid.appendChild(card);
  });
}

// ── PAGE NAVIGATION ───────────────────────────────────────────────────────────────────────────
function openModule(modId) {
  const mod = CURRICULUM.find(m => m.id === modId);
  if (!mod) return;
  openLesson(modId, mod.lessons[0].id);
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

  if (window.innerWidth <= 768) mobTab('theory');
}

function goHome() {
  $('lesson-page').style.display  = 'none';
  $('landing-page').style.display = 'flex';
  buildLandingPage();
}

// ── MOBILE TAB SWITCHING ──────────────────────────────────────────────────────────────────────────
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

// ── SIDEBAR ───────────────────────────────────────────────────────────────────────────────────
function renderSidebar(mod, activeLessonId) {
  const course = getCourseForModule(mod.id);

  if (course) {
    const chapterIdx = course.modules.indexOf(mod.id) + 1;
    $('sidebar-mod-title').textContent = `${course.icon} ${course.title}`;
    let chEl = $('sidebar-chapter-info');
    if (!chEl) {
      chEl = document.createElement('div');
      chEl.id = 'sidebar-chapter-info';
      chEl.className = 'sidebar-chapter-info';
      $('sidebar-module-header').appendChild(chEl);
    }
    chEl.textContent = `Ch ${chapterIdx}/${course.modules.length} · ${mod.icon} ${mod.title}`;
  } else {
    $('sidebar-mod-title').textContent = `${mod.icon} ${mod.title}`;
    const chEl = $('sidebar-chapter-info');
    if (chEl) chEl.remove();
  }

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

  // Progress footer
  const done  = mod.lessons.filter(l => STATE.completed.has(l.id)).length;
  const total = mod.lessons.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  $('sidebar-prog-label').textContent = `${done}/${total} lessons`;
  $('sidebar-prog-pct').textContent   = `${pct}%`;
  $('sidebar-prog-fill').style.width  = pct + '%';
}

// ── THEORY PANE ────────────────────────────────────────────────────────────────────────────────
function renderTheory(lesson) {
  $('theory-content').innerHTML = lesson.theory;

  const tasksEl = document.createElement('div');
  tasksEl.className = 'tasks-box';
  tasksEl.innerHTML = `<div class="tasks-title">✏ Your Tasks</div>` +
    lesson.tasks.map((t, i) => `
      <div class="task-item" id="task-${i}">
        <div class="task-check"></div>
        <span>${t}</span>
      </div>`).join('');
  $('theory-content').appendChild(tasksEl);

  const escapedHint = lesson.hint
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hintWrap = document.createElement('div');
  hintWrap.innerHTML = `
    <button class="hint-toggle" onclick="toggleHint()">💡 Show Hint</button>
    <div class="hint-box" id="hint-box"><pre class="hint-pre">${escapedHint}</pre></div>
  `;
  $('theory-content').appendChild(hintWrap);
  STATE.hintVisible = false;

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

// ── EDITORS ───────────────────────────────────────────────────────────────────────────────────
function loadEditors(modId, lesson) {
  const designKey = `${modId}-${lesson.id}-design`;
  const tbKey     = `${modId}-${lesson.id}-tb`;

  STATE.editorCache[designKey] = lsGet(designKey) || STATE.editorCache[designKey] || lesson.design;
  STATE.editorCache[tbKey]     = lsGet(tbKey)     || STATE.editorCache[tbKey]     || lesson.testbench;

  $('editor-design').value = STATE.editorCache[designKey];
  $('editor-tb').value     = STATE.editorCache[tbKey];

  syncLineNums('design');
  syncLineNums('tb');

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
  lsSet(key, STATE.editorCache[key]);
  syncLineNums(tab);
}

function syncLineNums(tab) {
  const ta  = $(`editor-${tab}`);
  const ln  = $(`lnum-${tab}`);
  const n   = ta.value.split('\n').length;
  ln.innerHTML = Array.from({length: n}, (_, i) => `<span>${i+1}</span>`).join('');
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

// ── NAVIGATION ───────────────────────────────────────────────────────────────────────────
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
  const mod = CURRICULUM.find(m => m.id === STATE.currentModule);
  if (!mod) return;
  const idx = mod.lessons.findIndex(l => l.id === STATE.currentLesson);

  let hasNext = idx < mod.lessons.length - 1;
  let hasPrev = idx > 0;

  // Cross-chapter navigation within a course
  const course = getCourseForModule(mod.id);
  if (course) {
    const modIdx = course.modules.indexOf(mod.id);
    if (!hasNext) hasNext = modIdx < course.modules.length - 1;
    if (!hasPrev) hasPrev = modIdx > 0;
  }

  $('btn-prev').disabled = !hasPrev;
  $('btn-next').disabled = !hasNext;
  $('btn-next-lesson').disabled = !hasNext;
}

function navPrev() {
  const mod = CURRICULUM.find(m => m.id === STATE.currentModule);
  if (!mod) return;
  const idx = mod.lessons.findIndex(l => l.id === STATE.currentLesson);

  if (idx > 0) {
    openLesson(mod.id, mod.lessons[idx - 1].id);
    return;
  }

  // First lesson in this chapter — go to last lesson of previous chapter in course
  const course = getCourseForModule(mod.id);
  if (course) {
    const modIdx = course.modules.indexOf(mod.id);
    if (modIdx > 0) {
      const prevMod = CURRICULUM.find(m => m.id === course.modules[modIdx - 1]);
      if (prevMod) openLesson(prevMod.id, prevMod.lessons[prevMod.lessons.length - 1].id);
    }
  }
}

function navNext() {
  const mod = CURRICULUM.find(m => m.id === STATE.currentModule);
  if (!mod) return;
  const idx = mod.lessons.findIndex(l => l.id === STATE.currentLesson);

  if (idx < mod.lessons.length - 1) {
    openLesson(mod.id, mod.lessons[idx + 1].id);
    return;
  }

  // Last lesson in this chapter — go to first lesson of next chapter in course
  const course = getCourseForModule(mod.id);
  if (course) {
    const modIdx = course.modules.indexOf(mod.id);
    if (modIdx < course.modules.length - 1) {
      const nextMod = CURRICULUM.find(m => m.id === course.modules[modIdx + 1]);
      if (nextMod) openLesson(nextMod.id, nextMod.lessons[0].id);
    }
  }
}

// ── SIMULATION ────────────────────────────────────────────────────────────────────────────
async function runSimulation() {
  const mod    = CURRICULUM.find(m => m.id === STATE.currentModule);
  const lesson = mod?.lessons.find(l => l.id === STATE.currentLesson);
  if (!lesson) return;

  const btn    = $('run-btn');
  const pill   = $('status-pill');
  const tool   = $('sim-select').value;

  const designCode = STATE.editorCache[`${STATE.currentModule}-${STATE.currentLesson}-design`] || lesson.design;
  const tbCode     = STATE.editorCache[`${STATE.currentModule}-${STATE.currentLesson}-tb`]     || lesson.testbench;

  const extraFlags = (tool === 'verilator') ? getVerilatorFlags() : [];

  const useUvm  = tool === 'verilator' && $('vf-uvm') && $('vf-uvm').checked;
  const uvmTest = useUvm ? ($('vf-uvm-test').value.trim()) : '';
  const uvmVerb = useUvm ? ($('vf-uvm-verb').value || 'UVM_MEDIUM') : 'UVM_MEDIUM';

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

      if (window.innerWidth <= 768) mobTab('output');

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

// ── CONSOLE ───────────────────────────────────────────────────────────────────────────────────
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

// ── TASKS & COMPLETION ──────────────────────────────────────────────────────────────────────────
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
  const mod = CURRICULUM.find(m => m.id === STATE.currentModule);
  if (mod) {
    renderSidebar(mod, STATE.currentLesson);
    renderProgressDots(mod, STATE.currentLesson);
  }
  checkCourseCompletion();
}

// ── COURSE COMPLETION & CERTIFICATE ─────────────────────────────────────────────────────────────
function checkCourseCompletion() {
  const mod = CURRICULUM.find(m => m.id === STATE.currentModule);
  if (!mod) return;
  const course = getCourseForModule(mod.id);
  if (!course) return;

  const courseModules = course.modules.map(id => CURRICULUM.find(m => m.id === id)).filter(Boolean);
  const total = courseModules.reduce((s, m) => s + m.lessons.length, 0);
  const done  = courseModules.reduce((s, m) => s + m.lessons.filter(l => STATE.completed.has(l.id)).length, 0);

  if (done >= total && total > 0) {
    setTimeout(() => showCertificate(course, courseModules), 1200);
  }
}

function showCertificate(course, courseModules) {
  const total = courseModules.reduce((s, m) => s + m.lessons.length, 0);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const existing = document.getElementById('cert-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'cert-modal';
  modal.innerHTML = `
    <div class="cert-overlay" onclick="closeCertificate()"></div>
    <div class="cert-container">
      <button class="cert-close" onclick="closeCertificate()">✕</button>
      <div class="cert-paper" id="cert-paper">
        <div class="cert-logo-row">
          <div class="cert-logo-chip">⬡</div>
          <span class="cert-logo-text">All About VLSI</span>
        </div>
        <div class="cert-stamp">Certificate of Completion</div>
        <div class="cert-divider"></div>
        <div class="cert-awarded">This certifies that</div>
        <input class="cert-name-input" id="cert-name" placeholder="Type your name here" maxlength="60" />
        <div class="cert-body">has successfully completed all <strong>${total} lessons</strong> across <strong>${courseModules.length} chapters</strong> of</div>
        <div class="cert-course-name">${course.icon} ${course.title}</div>
        <div class="cert-subtitle">SystemVerilog Hardware Description Language Curriculum</div>
        <div class="cert-chapters-row">${courseModules.map(m => `<span class="cert-chip">${m.icon} ${m.title}</span>`).join('')}</div>
        <div class="cert-date-row">
          <div class="cert-date-label">Date Issued</div>
          <div class="cert-date">${today}</div>
        </div>
        <div class="cert-footer">
          <div class="cert-sig">All About VLSI</div>
          <div class="cert-sig-label">allaboutvlsi.com</div>
        </div>
      </div>
      <div class="cert-actions">
        <div class="cert-name-hint">Type your name above, then download</div>
        <button class="cert-download-btn" onclick="downloadCertificate()">⬇ Download as PDF</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  showToast('🎓 Course Complete! Certificate ready.', 'pass');
}

function closeCertificate() {
  const modal = document.getElementById('cert-modal');
  if (modal) modal.remove();
}

function downloadCertificate() {
  const nameEl = document.getElementById('cert-name');
  if (!nameEl || !nameEl.value.trim()) {
    nameEl && nameEl.focus();
    showToast('Enter your name first', 'info');
    return;
  }
  window.print();
}

// ── BANNER / TOAST ──────────────────────────────────────────────────────────────────────────────
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

// ── WAVEFORM CONTROLS ───────────────────────────────────────────────────────────────────────────
function waveZoomIn()  { Waveform.zoomIn(); }
function waveZoomOut() { Waveform.zoomOut(); }
function waveFit()     { Waveform.zoomFit(); }

function toggleWaveExpand() {
  const pane = $('output-pane');
  pane.classList.toggle('expanded');
  $('wave-expand-btn').textContent = pane.classList.contains('expanded') ? '⟨ shrink' : '⟩ expand';
  Waveform.draw();
}

// ── SIM SELECT ──────────────────────────────────────────────────────────────────────────────
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

// ── VERILATOR OPTIONS PANEL ─────────────────────────────────────────────────────────────────────────
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
  fetchUvmInfo();
}

function closeVerilatorPanel() {
  _veriPanelOpen = false;
  $('veri-panel').style.display    = 'none';
  $('veri-backdrop').style.display = 'none';
  $('veri-opts-btn').classList.remove('active');
}

function resetVerilatorOptions() {
  $('vf-no-timing').checked = true;
  $('vf-timing').checked    = false;
  ['vf-Wall','vf-Wnofatal','vf-WnoWIDTH','vf-WnoUNUSED',
   'vf-WnoUNDRIVEN','vf-WnoCASE','vf-WnoUNSIGNED'].forEach(id => {
    $(id).checked = false;
  });
  $('vf-opt').value = '';
  $('vf-assert').checked    = false;
  $('vf-coverage').checked  = false;
  $('vf-lint-only').checked = false;
  $('vf-uvm').checked         = false;
  $('vf-uvm-test').value      = '';
  $('vf-uvm-verb').value      = 'UVM_MEDIUM';
  $('uvm-subopts').style.display = 'none';
  $('vf-extra').value = '';
  updateFlagsPreview();
}

function onUvmToggle() {
  const on = $('vf-uvm').checked;
  $('uvm-subopts').style.display = on ? 'flex' : 'none';
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

function getVerilatorFlags() {
  const flags = [];
  const timingEl = document.querySelector('input[name="veri-timing"]:checked');
  if (timingEl) flags.push(timingEl.value);

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

  const opt = $('vf-opt') && $('vf-opt').value;
  if (opt) flags.push(opt);

  if ($('vf-assert')   && $('vf-assert').checked)   flags.push('--assert');
  if ($('vf-coverage') && $('vf-coverage').checked) flags.push('--coverage');
  if ($('vf-lint-only')&& $('vf-lint-only').checked)flags.push('--lint-only');

  const extra = $('vf-extra') ? $('vf-extra').value.trim() : '';
  if (extra) flags.push(...extra.split(/\s+/).filter(f => f.startsWith('-')));

  return flags;
}

function updateFlagsPreview() {
  const preview = $('veri-flags-preview');
  if (!preview) return;
  const flags = getVerilatorFlags();
  const allFlags = ['--cc','--exe','--build','--sv','--trace', ...flags];
  if (allFlags.length > 3) {
    preview.textContent = 'verilator ' + allFlags.join(' ');
    preview.classList.add('has-flags');
  } else {
    preview.textContent = '';
    preview.classList.remove('has-flags');
  }
}

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

// ── VERILATOR VERSION BADGE ─────────────────────────────────────────────────────────────────────────
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

// ── UVM AVAILABILITY CHECK ────────────────────────────────────────────────────────────────────────
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
      unavailMsg.style.display = 'block';
      unavailMsg.textContent   = `⚠ UVM library not found — ${info.reason}`;
      if (uvmCheckbox)  uvmCheckbox.disabled = true;
      if (toggleRow)    toggleRow.style.opacity = '0.45';
    } else {
      unavailMsg.style.display = 'none';
      if (uvmCheckbox) uvmCheckbox.disabled = false;
      if (toggleRow)   toggleRow.style.opacity = '';
    }
  } catch (_) { /* ignore */ }
}

// ── FEEDBACK ─────────────────────────────────────────────────────────────────────────────────
let _fbRating = 0;

function openFeedback() {
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

// ── SERVER PING ─────────────────────────────────────────────────────────────────────────────────
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
