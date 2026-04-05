// ═══════════════════════════════════════════════════════
// waveform.js — VCD Parser + Canvas Waveform Renderer
// All About VLSI
// ═══════════════════════════════════════════════════════

const Waveform = (() => {

  // ── VCD PARSER ──────────────────────────────────────────────
  function parseVCD(vcd) {
    const signals   = {};  // name -> { width, changes: [{time, val}], order }
    const idMap     = {};  // symbol -> name
    let   curTime   = 0;
    let   sigOrder  = 0;
    let   timescale = { value: 1, unit: 'ns' };

    const lines = vcd.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // timescale: $timescale 1ns $end
      if (line.startsWith('$timescale')) {
        const ts = lines[i + 1] ? lines[i + 1].trim() : line.replace('$timescale','').replace('$end','').trim();
        const m = ts.match(/(\d+)\s*(ps|ns|us|ms|s)/);
        if (m) { timescale.value = parseInt(m[1]); timescale.unit = m[2]; }
        continue;
      }

      // $var wire 4 ! count $end
      if (line.startsWith('$var')) {
        const p = line.split(/\s+/);
        if (p.length >= 5) {
          const width  = parseInt(p[2]) || 1;
          const sym    = p[3];
          const name   = p[4].replace(/\[.*\]/, '');
          idMap[sym]   = name;
          if (!signals[name]) {
            signals[name] = { width, changes: [], order: sigOrder++ };
          }
        }
        continue;
      }

      // timestamp: #1000
      if (line.startsWith('#')) {
        curTime = parseInt(line.slice(1)) || 0;
        continue;
      }

      // scalar: 0! or 1" etc
      if (/^[01xzXZ][^\s]/.test(line)) {
        const val = line[0].toLowerCase();
        const sym = line.slice(1);
        const nm  = idMap[sym];
        if (nm && signals[nm]) {
          signals[nm].changes.push({ time: curTime, val });
        }
        continue;
      }

      // vector: b0101 !
      if (/^[bB]/.test(line)) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const binStr = parts[0].slice(1);
          const val    = /^[01]+$/.test(binStr) ? parseInt(binStr, 2) : 'x';
          const sym    = parts[1];
          const nm     = idMap[sym];
          if (nm && signals[nm]) {
            signals[nm].changes.push({ time: curTime, val });
          }
        }
      }
    }

    // remove signals with no changes
    Object.keys(signals).forEach(k => {
      if (signals[k].changes.length === 0) delete signals[k];
    });

    return { signals, timescale };
  }

  // ── RENDERER ────────────────────────────────────────────────
  const LABEL_W  = 72;   // width for signal name
  const ROW_H    = 32;   // height per signal row
  const PAD_R    = 16;   // right padding
  const TS_H     = 20;   // timescale header height

  let _signals   = null;
  let _maxTime   = 0;
  let _timescale = { value: 1, unit: 'ns' };
  let _canvas    = null;
  let _container = null;
  let _tooltip   = null;
  let _zoom      = 1.0;   // horizontal zoom factor

  function init(canvasEl, containerEl) {
    _canvas    = canvasEl;
    _container = containerEl;
    _tooltip   = createTooltip();
    _canvas.addEventListener('mousemove', onMouseMove);
    _canvas.addEventListener('mouseleave', onMouseLeave);
    _canvas.addEventListener('wheel', onWheel, { passive: false });
  }

  function createTooltip() {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;background:#0e1219;border:1px solid #2a3550;
      color:#8899bb;font-family:'JetBrains Mono',monospace;font-size:0.65rem;
      padding:4px 8px;border-radius:4px;pointer-events:none;display:none;z-index:999;`;
    document.body.appendChild(t);
    return t;
  }

  function render(parsedData) {
    if (!parsedData) { clear(); return; }
    _signals   = parsedData.signals;
    _timescale = parsedData.timescale;
    _maxTime   = 0;
    const names = Object.keys(_signals).sort((a,b) => _signals[a].order - _signals[b].order);
    names.forEach(n => {
      const ch = _signals[n].changes;
      if (ch.length) _maxTime = Math.max(_maxTime, ch[ch.length - 1].time);
    });
    _zoom = 1.0;
    draw();
  }

  function draw() {
    if (!_signals || !_canvas) return;
    const names = Object.keys(_signals).sort((a,b) => _signals[a].order - _signals[b].order);
    if (names.length === 0) { clear(); return; }

    const containerW = _container.offsetWidth || 360;
    const drawW      = Math.max(containerW, (containerW - LABEL_W - PAD_R) * _zoom + LABEL_W + PAD_R);
    const H          = TS_H + names.length * ROW_H + 4;

    _canvas.width  = drawW;
    _canvas.height = H;
    _canvas.style.minWidth = drawW + 'px';

    const ctx = _canvas.getContext('2d');
    ctx.clearRect(0, 0, drawW, H);

    // background
    ctx.fillStyle = '#080b10';
    ctx.fillRect(0, 0, drawW, H);

    // label column background
    ctx.fillStyle = '#0e1219';
    ctx.fillRect(0, 0, LABEL_W, H);

    const toX = t => LABEL_W + (t / _maxTime) * (_zoom * (containerW - LABEL_W - PAD_R));

    // timescale header
    drawTimescale(ctx, drawW, toX);

    // grid lines
    const gridLines = 10;
    for (let g = 0; g <= gridLines; g++) {
      const t  = (_maxTime / gridLines) * g;
      const x  = toX(t);
      ctx.strokeStyle = '#1e2738';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(x, TS_H);
      ctx.lineTo(x, H);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // row separators
    names.forEach((name, row) => {
      const y = TS_H + row * ROW_H;
      ctx.strokeStyle = '#131820';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y + ROW_H);
      ctx.lineTo(drawW, y + ROW_H);
      ctx.stroke();
    });

    // signals
    names.forEach((name, row) => {
      drawSignal(ctx, name, row, toX, drawW);
    });

    // label divider
    ctx.strokeStyle = '#2a3550';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LABEL_W, 0);
    ctx.lineTo(LABEL_W, H);
    ctx.stroke();
  }

  function drawTimescale(ctx, drawW, toX) {
    ctx.fillStyle = '#0e1219';
    ctx.fillRect(0, 0, drawW, TS_H);
    ctx.strokeStyle = '#1e2738';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, TS_H);
    ctx.lineTo(drawW, TS_H);
    ctx.stroke();

    // draw time markers
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const t = (_maxTime / steps) * s;
      const x = toX(t);
      ctx.fillStyle = '#445577';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      const label = formatTime(t, _timescale);
      ctx.fillText(label, x, TS_H - 4);

      ctx.strokeStyle = '#2a3550';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.lineTo(x, TS_H);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
  }

  function drawSignal(ctx, name, row, toX, drawW) {
    const sig   = _signals[name];
    const ch    = sig.changes;
    const isBus = sig.width > 1;

    const yTop  = TS_H + row * ROW_H + 5;
    const yBot  = yTop + ROW_H - 10;
    const yMid  = (yTop + yBot) / 2;

    // label
    ctx.fillStyle = '#445577';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    const label = name.length > 8 ? name.slice(0, 7) + '…' : name;
    ctx.fillText(label, LABEL_W - 6, yMid + 3);
    ctx.textAlign = 'left';

    if (ch.length === 0) return;

    if (!isBus) {
      // 1-bit digital waveform
      ctx.strokeStyle = '#00d4aa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      let prevVal = ch[0].val;
      let prevX   = LABEL_W;

      ctx.moveTo(prevX, prevVal === '1' ? yTop : yBot);

      ch.forEach(({ time, val }) => {
        const x = toX(time);
        if (prevVal === 'x' || prevVal === 'z') {
          // draw hatched unknown region
          drawUnknown(ctx, prevX, x, yTop, yBot);
          ctx.beginPath();
          ctx.moveTo(x, val === '1' ? yTop : yBot);
        } else {
          ctx.lineTo(x, prevVal === '1' ? yTop : yBot);
          ctx.lineTo(x, val     === '1' ? yTop : yBot);
        }
        prevVal = val;
        prevX   = x;
      });

      if (prevVal !== 'x' && prevVal !== 'z') {
        ctx.lineTo(drawW - PAD_R, prevVal === '1' ? yTop : yBot);
      }
      ctx.stroke();

    } else {
      // bus signal
      ctx.strokeStyle = '#4f8ef7';
      ctx.lineWidth = 1.5;

      let prevX   = LABEL_W;
      let prevVal = ch[0].val;

      const drawBusSeg = (x0, x1, val) => {
        if (x1 <= x0) return;
        const kw = Math.min(5, (x1 - x0) * 0.12);
        ctx.beginPath();
        ctx.moveTo(x0,     yMid);
        ctx.lineTo(x0+kw,  yTop);
        ctx.lineTo(x1-kw,  yTop);
        ctx.lineTo(x1,     yMid);
        ctx.lineTo(x1-kw,  yBot);
        ctx.lineTo(x0+kw,  yBot);
        ctx.closePath();

        if (val === 'x') {
          ctx.fillStyle = 'rgba(247,111,111,0.1)';
          ctx.strokeStyle = '#f76f6f';
        } else {
          ctx.fillStyle = 'rgba(79,142,247,0.06)';
          ctx.strokeStyle = '#4f8ef7';
        }
        ctx.fill();
        ctx.stroke();

        if (x1 - x0 > 20 && val !== 'x') {
          ctx.fillStyle = '#4f8ef7';
          ctx.font = '8px JetBrains Mono, monospace';
          const label = typeof val === 'number'
            ? (val > 15 ? `0x${val.toString(16).toUpperCase()}` : String(val))
            : String(val);
          ctx.fillText(label, x0 + kw + 3, yMid + 3);
        }
      };

      ch.forEach(({ time, val }) => {
        const x = toX(time);
        drawBusSeg(prevX, x, prevVal);
        prevX   = x;
        prevVal = val;
      });
      drawBusSeg(prevX, drawW - PAD_R, prevVal);
    }
  }

  function drawUnknown(ctx, x0, x1, yTop, yBot) {
    ctx.save();
    ctx.fillStyle = 'rgba(247,111,111,0.12)';
    ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
    ctx.strokeStyle = '#f76f6f';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(x0, yTop); ctx.lineTo(x0, yBot);
    ctx.moveTo(x1, yTop); ctx.lineTo(x1, yBot);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function clear() {
    if (!_canvas) return;
    _signals = null;
    _canvas.width = _container ? _container.offsetWidth : 360;
    _canvas.height = 100;
    const ctx = _canvas.getContext('2d');
    ctx.fillStyle = '#080b10';
    ctx.fillRect(0, 0, _canvas.width, _canvas.height);
    ctx.fillStyle = '#445577';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Run simulation to see waveform', _canvas.width / 2, 52);
    ctx.textAlign = 'left';
  }

  // ── INTERACTIONS ─────────────────────────────────────────────
  function onMouseMove(e) {
    if (!_signals || !_canvas) return;
    const rect    = _canvas.getBoundingClientRect();
    const mx      = e.clientX - rect.left;
    const my      = e.clientY - rect.top;

    if (mx < LABEL_W) { _tooltip.style.display = 'none'; return; }

    const containerW = _container.offsetWidth;
    const t = Math.round(((mx - LABEL_W) / (_zoom * (containerW - LABEL_W - PAD_R))) * _maxTime);
    const ts = formatTime(t, _timescale);

    // find which signal row
    const rowIdx = Math.floor((my - TS_H) / ROW_H);
    const names  = Object.keys(_signals).sort((a,b) => _signals[a].order - _signals[b].order);
    const name   = names[rowIdx];
    let valStr   = '';
    if (name) {
      const sig = _signals[name];
      // find value at time t
      let val = sig.changes.length > 0 ? sig.changes[0].val : '?';
      for (const ch of sig.changes) {
        if (ch.time <= t) val = ch.val;
        else break;
      }
      valStr = ` | ${name} = ${sig.width > 1 && typeof val === 'number' ? `0x${val.toString(16).toUpperCase()} (${val})` : val}`;
    }

    _tooltip.textContent = `t = ${ts}${valStr}`;
    _tooltip.style.display = 'block';
    _tooltip.style.left = (e.clientX + 12) + 'px';
    _tooltip.style.top  = (e.clientY - 10) + 'px';

    // crosshair
    draw();
    const ctx = _canvas.getContext('2d');
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(mx, TS_H);
    ctx.lineTo(mx, _canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function onMouseLeave() {
    _tooltip.style.display = 'none';
    draw();
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.18;
    _zoom = Math.max(0.5, Math.min(20, _zoom * delta));
    draw();
  }

  function formatTime(t, ts) {
    const val = t * ts.value;
    if (val >= 1000000) return `${(val/1000000).toFixed(1)}ms`;
    if (val >= 1000)    return `${(val/1000).toFixed(1)}us`;
    return `${val}${ts.unit}`;
  }

  function zoomIn()  { _zoom = Math.min(20,  _zoom * 1.4); draw(); }
  function zoomOut() { _zoom = Math.max(0.5, _zoom / 1.4); draw(); }
  function zoomFit() { _zoom = 1.0; draw(); }

  return { init, render, clear, parseVCD, zoomIn, zoomOut, zoomFit, draw };

})();
