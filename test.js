/**
 * ROSA MATHEMATICA — Comprehensive Verification & Edge-Case Test Suite
 * Deeply tests:
 * 1. 3D Parametric Rose Math (Cortés, Nylander, Fibonacci) across bloom & density boundaries
 * 2. Analytical/Finite-Difference Surface Normals & Anatomical Part Tagging
 * 3. Z-Buffered Directional ASCII Rasterizer, Overlapping Petal Creases, & 8 Palettes × 7 Ramps
 * 4. 3D Tumbling Falling Petals, Rising Pollen, & Cursor Repulsion Physics
 * 5. Full Interactive Controller (app.js) DOM Event Simulation (Sliders, Buttons, Modals, Orbit, Keyboard)
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RoseMath = require('./rose-math.js');
const RoseRenderer = require('./ascii-renderer.js');
const RoseAudio = require('./audio-engine.js');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('Running ROSA MATHEMATICA Verification Suite...\n');

// 1. Mathematical Models & Normal Integrity
test('All 3 mathematical rose models generate finite 3D coordinates and unit normals across bloom boundary values', () => {
  const models = ['cortes', 'nylander', 'fibonacci'];
  const blooms = [0.02, 0.15, 0.5, 0.95, 1.25];

  for (const model of models) {
    for (const bloom of blooms) {
      const pts = RoseMath.generateRosePointCloud({
        model,
        bloom,
        density: 0.7,
        thornDetail: 0.8
      });
      assert(pts.length > 2000, `Expected >2000 points for ${model} at bloom=${bloom}, got ${pts.length}`);

      const partsSeen = new Set();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        assert(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z), `Non-finite coord at index ${i} in ${model}`);
        assert(Number.isFinite(p.nx) && Number.isFinite(p.ny) && Number.isFinite(p.nz), `Non-finite normal at index ${i} in ${model}`);
        const nLen = Math.hypot(p.nx, p.ny, p.nz);
        assert(Math.abs(nLen - 1.0) < 1e-3, `Normal not unit length (${nLen}) in ${model}`);
        assert(p.r >= 0 && p.r <= 1 && p.g >= 0 && p.g <= 1 && p.b >= 0 && p.b <= 1, `Color out of [0,1] range in ${model}`);
        partsSeen.add(p.part);
      }

      // Every model must include petals, sepals, leaves, stem, and thorns
      assert(partsSeen.has('petal'), `${model} missing petals`);
      assert(partsSeen.has('sepal'), `${model} missing sepals`);
      assert(partsSeen.has('leaf'), `${model} missing leaves`);
      assert(partsSeen.has('stem'), `${model} missing stem`);
      assert(partsSeen.has('thorn'), `${model} missing thorns`);
    }
  }
});

// 2. Bloom Articulation Monotonicity Check
test('Bloom parameter expands radial span of rose head from tight bud (0.06) to full bloom (1.0)', () => {
  for (const model of ['cortes', 'nylander', 'fibonacci']) {
    const budPts = RoseMath.generateRosePointCloud({ model, bloom: 0.06, density: 0.6 });
    const fullPts = RoseMath.generateRosePointCloud({ model, bloom: 1.0, density: 0.6 });

    const maxRadius = (pts) => {
      let maxR = 0;
      for (const p of pts) {
        if (p.part === 'petal') {
          maxR = Math.max(maxR, Math.hypot(p.x, p.z));
        }
      }
      return maxR;
    };

    const rBud = maxRadius(budPts);
    const rFull = maxRadius(fullPts);
    assert(rFull > rBud * 1.25, `Expected ${model} full bloom radius (${rFull}) > 1.25x bud radius (${rBud})`);
  }
});

// 3. All 8 Color Palettes & 7 Glyph Ramps
test('All 8 color palettes and 7 glyph ramps rasterize valid Z-buffered frames without error', () => {
  const engine = new RoseRenderer.AsciiRoseEngine({ cols: 80, rows: 45 });
  const palettes = Object.keys(RoseRenderer.PALETTES);
  const ramps = Object.keys(RoseRenderer.GLYPH_RAMPS);

  assert.strictEqual(palettes.length, 8, 'Expected 8 color palettes');
  assert.strictEqual(ramps.length, 7, 'Expected 7 glyph ramps');

  for (const pal of palettes) {
    for (const ramp of ramps) {
      engine.paletteKey = pal;
      engine.rampKey = ramp;
      const stats = engine.renderFrame(1.25);
      assert(stats.activeCells > 200, `Too few active cells (${stats.activeCells}) for ${pal}/${ramp}`);

      const ascii = engine.toAsciiString(true);
      assert(ascii.length > 500, `ASCII output too short for ${pal}/${ramp}`);
    }
  }
});

// 4. Physics, Wind Gusts, Pointer Repulsion & Camera Boundary Values
test('Particle physics, wind gusts, cursor repulsion, and extreme camera angles handle edge cases safely', () => {
  const engine = new RoseRenderer.AsciiRoseEngine({ cols: 110, rows: 60 });
  engine.pointerActive = true;
  engine.pointerX = 0.05;
  engine.pointerY = -0.1;

  engine.triggerWindGust(20);
  assert(engine.fallingPetals.length >= 20, 'Wind gust should spawn falling petals');

  for (let step = 0; step < 30; step++) {
    engine.stepPhysics(0.05, step * 0.05);
  }

  // Extreme camera pitch and close zoom
  engine.camPitch = 1.25;
  engine.camYaw = -4.5;
  engine.camDist = 1.45;
  const statsClose = engine.renderFrame(2.0);
  assert(statsClose.activeCells > 100, 'Close zoom should render active cells');

  // Extreme tiny grid resize
  engine.resizeGrid(20, 15);
  const statsSmall = engine.renderFrame(2.5);
  assert(statsSmall.activeCells > 10, 'Tiny grid should render safely');
});

// 5. Mock Canvas2D Rendering Check
test('drawToCanvas executes all rendering passes (background gradient, bloom glow, glyphs, scanlines)', () => {
  const engine = new RoseRenderer.AsciiRoseEngine({ cols: 70, rows: 40, glowIntensity: 0.8, scanlines: true });
  engine.renderFrame(0.5);

  let fillTextCalls = 0;
  let fillRectCalls = 0;
  const mockCtx = {
    fillStyle: '',
    font: '',
    textBaseline: '',
    textAlign: '',
    globalCompositeOperation: 'source-over',
    save() {},
    restore() {},
    createRadialGradient() {
      return { addColorStop() {} };
    },
    fillRect() { fillRectCalls++; },
    fillText() { fillTextCalls++; }
  };

  engine.drawToCanvas(mockCtx, 1280, 720);
  assert(fillTextCalls > 150, `Expected >150 fillText calls, got ${fillTextCalls}`);
  assert(fillRectCalls > 100, `Expected >100 fillRect calls, got ${fillRectCalls}`);
});

// 6. DOM & Script Integrity Verification
test('All DOM IDs referenced in app.js exist in index.html', () => {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

  const idRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
  let match;
  const checkedIds = [];
  while ((match = idRegex.exec(appJs)) !== null) {
    const id = match[1];
    checkedIds.push(id);
    assert(
      html.includes(`id="${id}"`),
      `DOM id="${id}" referenced in app.js is missing from index.html!`
    );
  }
  assert(checkedIds.length >= 8, `Expected at least 8 bound DOM IDs, checked ${checkedIds.length}`);
});

// 7. Full Interactive App Controller (app.js) Simulation
test('app.js initializes cleanly and responds to UI controls, sliders, keyboard shortcuts, and pointer orbit', () => {
  const elements = {};
  const makeEl = (id, tag = 'DIV') => {
    const listeners = {};
    const classSet = new Set();
    const el = {
      id,
      tagName: tag,
      value: '0.92',
      checked: false,
      textContent: '',
      innerHTML: '',
      dataset: {},
      style: { setProperty() {} },
      children: [],
      classList: {
        add(c) { classSet.add(c); },
        remove(c) { classSet.delete(c); },
        toggle(c, force) {
          if (typeof force === 'boolean') {
            if (force) classSet.add(c); else classSet.delete(c);
            return force;
          }
          if (classSet.has(c)) { classSet.delete(c); return false; }
          classSet.add(c); return true;
        },
        contains(c) { return classSet.has(c); }
      },
      addEventListener(type, fn) {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(fn);
      },
      trigger(type, evt = {}) {
        (listeners[type] || []).forEach((fn) => fn(Object.assign({ target: el, preventDefault() {} }, evt)));
      },
      click() {
        this.trigger('click');
      },
      appendChild(child) {
        this.children.push(child);
      },
      querySelector() {
        return { textContent: 'Model Name' };
      },
      querySelectorAll() {
        return this.children;
      },
      setPointerCapture() {},
      getContext() {
        return {
          fillStyle: '',
          font: '',
          textBaseline: '',
          textAlign: '',
          globalCompositeOperation: 'source-over',
          save() {},
          restore() {},
          createRadialGradient() { return { addColorStop() {} }; },
          fillRect() {},
          fillText() {}
        };
      },
      toDataURL() { return 'data:image/png;base64,iVBORw0KGgo='; }
    };
    return el;
  };

  // Pre-populate elements from index.html
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const idMatches = html.matchAll(/id="([^"]+)"/g);
  for (const m of idMatches) {
    elements[m[1]] = makeEl(m[1]);
  }

  const modelCard1 = makeEl('mc1', 'BUTTON'); modelCard1.dataset.model = 'cortes';
  const modelCard2 = makeEl('mc2', 'BUTTON'); modelCard2.dataset.model = 'nylander';
  const modelCard3 = makeEl('mc3', 'BUTTON'); modelCard3.dataset.model = 'fibonacci';
  const phaseBtn1 = makeEl('pb1', 'BUTTON'); phaseBtn1.dataset.bloom = '0.14'; phaseBtn1.dataset.phaseId = 'bud';
  const phaseBtn2 = makeEl('pb2', 'BUTTON'); phaseBtn2.dataset.bloom = '1.16'; phaseBtn2.dataset.phaseId = 'overbloom';

  const winListeners = {};
  let rafCallback = null;

  const sandbox = {
    window: {
      AsciiRoseMath: RoseMath,
      AsciiRoseRenderer: RoseRenderer,
      AsciiRoseAudio: RoseAudio,
      innerWidth: 1440,
      innerHeight: 900,
      devicePixelRatio: 1,
      addEventListener(type, fn) {
        if (!winListeners[type]) winListeners[type] = [];
        winListeners[type].push(fn);
      },
      triggerWindow(type, evt = {}) {
        (winListeners[type] || []).forEach((fn) => fn(Object.assign({ preventDefault() {} }, evt)));
      }
    },
    document: {
      readyState: 'complete',
      documentElement: makeEl('html'),
      body: makeEl('body'),
      getElementById(id) { return elements[id] || null; },
       createElement(tag) { return makeEl('', tag.toUpperCase()); },
      querySelectorAll(sel) {
        if (sel === '.model-card') return [modelCard1, modelCard2, modelCard3];
        if (sel === '.phase-btn[data-bloom]') return [phaseBtn1, phaseBtn2];
        return [];
      }
    },
    navigator: {
      clipboard: {
        writeText() { return Promise.resolve(); }
      }
    },
    performance: { now: () => 1000 },
    requestAnimationFrame(fn) { rafCallback = fn; },
    setTimeout,
    clearTimeout,
    Blob: function () {},
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    Math,
    Date,
     parseFloat,
    Number,
    Object,
    Array,
    Boolean,
    Map
  };
  sandbox.self = sandbox.window;

  const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  vm.runInNewContext(appCode, sandbox);

  const app = sandbox.window.__ROSA_APP__;
  assert(app && app.engine && app.state, 'app.js should expose __ROSA_APP__');

  // Step several animation frames
  assert(typeof rafCallback === 'function', 'requestAnimationFrame should be registered');
  rafCallback(1016);
  rafCallback(1032);

  // Test switching models via model card click
  modelCard2.click();
  assert.strictEqual(app.engine.model, 'nylander');
  modelCard3.click();
  assert.strictEqual(app.engine.model, 'fibonacci');

  // Test bloom slider input
  elements['slider-bloom'].value = '0.25';
  elements['slider-bloom'].trigger('input');
  assert.strictEqual(app.engine.bloom, 0.25);

  // Test pointer orbit on viewport
  const vp = elements['viewport-container'];
  vp.trigger('pointerdown', { clientX: 500, clientY: 500, pointerId: 1, button: 0 });
  assert.strictEqual(app.engine.pointerDragging, true, 'pointerdown should set engine.pointerDragging');
  const prevYaw = app.engine.camYaw;
  vp.trigger('pointermove', { clientX: 580, clientY: 520, pointerId: 1 });
  assert(app.engine.camYaw !== prevYaw, 'Pointer drag should orbit camYaw');
  vp.trigger('pointerup', { pointerId: 1 });
  assert.strictEqual(app.engine.pointerDragging, false, 'pointerup should clear engine.pointerDragging');

  // Test two-finger pinch-to-zoom on viewport
  const distBeforePinch = app.engine.camDist;
  vp.trigger('pointerdown', { clientX: 400, clientY: 500, pointerId: 10, button: 0 });
  vp.trigger('pointerdown', { clientX: 500, clientY: 500, pointerId: 11, button: 0 });
  vp.trigger('pointermove', { clientX: 600, clientY: 500, pointerId: 11 }); // Spread fingers wider -> zoom in (smaller camDist)
  assert(app.engine.camDist < distBeforePinch, `Two-finger pinch spread should decrease camDist (${app.engine.camDist} < ${distBeforePinch})`);
  vp.trigger('pointerup', { pointerId: 10 });
  vp.trigger('pointerup', { pointerId: 11 });

  // Test keyboard shortcuts (Zen mode 'h', wind gust 'w', reset camera 'r', space pause)
  assert(sandbox.document.body.classList.contains('zen-mode'), 'zen-mode should be active by default');
  sandbox.window.triggerWindow('keydown', { key: 'h', target: { tagName: 'BODY' } });
  assert(!sandbox.document.body.classList.contains('zen-mode'), 'Key H should toggle zen-mode class off');
  sandbox.window.triggerWindow('keydown', { key: 'h', target: { tagName: 'BODY' } });
  assert(sandbox.document.body.classList.contains('zen-mode'), 'Key H should toggle zen-mode class back on');
  sandbox.window.triggerWindow('keydown', { key: 'Escape', target: { tagName: 'BODY' } });
  assert(!sandbox.document.body.classList.contains('zen-mode'), 'Escape should exit zen-mode');

  sandbox.window.triggerWindow('keydown', { key: ' ', target: { tagName: 'BODY' } });
  assert.strictEqual(app.state.isPlaying, false, 'Spacebar should toggle pause');

  // Verify landscape grid aspect ratio (rows < cols for 1:1 geometric proportions)
  assert(app.engine.rows < app.engine.cols, `Expected rows < cols on landscape viewport, got ${app.engine.cols}x${app.engine.rows}`);
});

// 8. Audio Engine Headless Safety
test('BotanicalAudioEngine degrades safely in non-browser environment', () => {
  const audio = new RoseAudio.BotanicalAudioEngine();
  assert.strictEqual(audio.toggle(), false);
  assert.strictEqual(audio.update(0.016, 0.9, 0.4), 0);
  audio.playChime(0, 0.5);
  audio.playWindCascade();
});

// 9. High-Density Finite-Difference Surface Normals (Regression for v >= 0.999 zero-normal bug)
test('High-density point clouds (density = 1.5625 and 2.0) have zero degenerate normals across all models', () => {
  for (const model of ['cortes', 'nylander', 'fibonacci', 'lotus', 'dahlia']) {
    for (const density of [1.5625, 2.0]) {
      const pts = RoseMath.generateRosePointCloud({ model, bloom: 0.9, density });
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const nLen = Math.hypot(p.nx, p.ny, p.nz);
        assert(Math.abs(nLen - 1.0) < 1e-3, `Degenerate normal (${nLen}) at index ${i} in ${model} at density=${density}`);
      }
    }
  }
});

// 10. Anatomical Receptacle Attachment & Golden-Angle Spiral Distribution (Regression for floating Nylander & 185.8 deg Cortes bug)
test('All 5 flower models anchor petal bases into the receptacle (minY <= 0.08) across all bloom stages and distribute petals around 360 deg', () => {
  for (const model of ['cortes', 'nylander', 'fibonacci', 'lotus', 'dahlia']) {
    for (const bloom of [0.14, 0.56, 0.92, 1.16]) {
      const pts = RoseMath.generateFlowerHeadCloud({ model, bloom, density: 0.7 });
      let minPetalY = Infinity;
      const quadrants = [0, 0, 0, 0];
      for (const p of pts) {
        if (p.part === 'petal') {
          if (p.y < minPetalY) minPetalY = p.y;
          const q = (p.x >= 0 ? 0 : 1) + (p.z >= 0 ? 0 : 2);
          quadrants[q]++;
        }
      }
      assert(minPetalY <= 0.08, `Model ${model} at bloom=${bloom} has floating petals (minY=${minPetalY} > 0.08)`);
      for (let q = 0; q < 4; q++) {
        assert(quadrants[q] > 100, `Model ${model} at bloom=${bloom} is lopsided in quadrant ${q} (${quadrants[q]} pts)`);
      }
    }
  }
});

// 11. Static Foliage Cache Separation during Continuous Bloom Scrubbing
test('Continuous bloom scrubbing reuses cached static foliage cloud without recomputing stem, leaves, or thorns', () => {
  const engine = new RoseRenderer.AsciiRoseEngine({ cols: 130, rows: 72 });
  engine.renderFrame(0);
  const initialFoliageRef = engine._staticFoliageCloud;
  assert(initialFoliageRef.length > 1500, 'Static foliage cloud should be populated');

  for (let b = 0.1; b <= 1.15; b += 0.15) {
    engine.bloom = b;
    engine.renderFrame(b);
    assert.strictEqual(
      engine._staticFoliageCloud,
      initialFoliageRef,
      'Static foliage cloud reference must remain cached across bloom changes'
    );
  }
});

// 12. Cursor Hover Breeze Integrity (Regression for cursor punching an empty hole in the rose head)
test('Hovering cursor over center of rose head preserves solid Z-buffer coverage without tearing holes', () => {
  const engine = new RoseRenderer.AsciiRoseEngine({ cols: 110, rows: 60 });
  engine.pointerActive = true;
  engine.pointerDragging = false;
  engine.pointerX = 0.0;
  engine.pointerY = -0.15;
  engine.renderFrame(0);

  // Check central 10x6 window over the flower head (around col 55, row 25)
  let filledInCore = 0;
  for (let r = 22; r <= 28; r++) {
    for (let c = 50; c <= 60; c++) {
      if (engine.partBuf[r * engine.cols + c] !== 0) filledInCore++;
    }
  }
  assert(filledInCore >= 60, `Expected solid flower core under cursor (>=60/77 cells), got ${filledInCore}`);
});

// 13. Touch-Action CSS & Responsive Rules Verification
test('styles.css includes touch-action: none on viewport/canvas and overflow-x: auto on species-pills', () => {
  const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
  assert(css.includes('touch-action: none'), 'styles.css must set touch-action: none to prevent touch pointercancel');
  assert(css.includes('overflow-x: auto'), 'styles.css must allow horizontal scroll on .species-pills for small screens');
});

console.log(`\nAll ${passed} verification test suites passed!`);
