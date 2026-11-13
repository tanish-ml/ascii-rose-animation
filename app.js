/**
 * ROSA — Minimalist 3D ASCII Flora Controller
 */
(function () {
  'use strict';

  const RoseMath = window.AsciiRoseMath;
  const RoseRenderer = window.AsciiRoseRenderer;
  const RoseAudio = window.AsciiRoseAudio;

  function initApp() {
    const canvas = document.getElementById('ascii-canvas');
    const viewport = document.getElementById('viewport-container');
    if (!canvas || !viewport) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    const isMobile = window.innerWidth <= 640;

    const engine = new RoseRenderer.AsciiRoseEngine({
      cols: isMobile ? 72 : 100,
      rows: 40,
      model: 'cortes',
      palette: 'crimson',
      ramp: 'botanical',
      bloom: 0.92,
      density: 0.78,
      thornDetail: 0.75,
      windStrength: 0.35,
      glowIntensity: 0.65,
      scanlines: true
    });

    const audio = new RoseAudio.BotanicalAudioEngine();
    const paletteKeys = Object.keys(RoseRenderer.PALETTES);
    let paletteIdx = 0;

    const state = {
      isPlaying: true,
      targetBloom: 0.92,
      rotSpeed: 0.42,
      baseCols: isMobile ? 72 : 100,
      isDragging: false,
      dragMode: 'orbit',
      lastMouseX: 0,
      lastMouseY: 0,
      velYaw: 0,
      velPitch: 0,
      elapsedTime: 0,
      lastFrameTime: performance.now()
    };

    window.__ROSA_APP__ = { engine, audio, state };

    function updateCanvasAndGridSize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      state.baseCols = w <= 640 ? 72 : 100;
      const charAspect = 0.55;
      const cols = state.baseCols;
      const rows = Math.max(24, Math.round(cols * (h / Math.max(1, w)) * charAspect));
      engine.resizeGrid(cols, rows);
    }

    window.addEventListener('resize', updateCanvasAndGridSize);
    updateCanvasAndGridSize();

    const toastEl = document.getElementById('toast-notification');
    let toastTimer = null;
    function showToast(msg) {
      if (!toastEl) return;
      toastEl.textContent = msg;
      toastEl.classList.add('visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastEl.classList.remove('visible');
      }, 1800);
    }

    function applyThemeAccent(paletteKey) {
      const pal = RoseRenderer.PALETTES[paletteKey] || RoseRenderer.PALETTES.crimson;
      document.documentElement.style.setProperty('--accent', pal.accent);
      document.documentElement.style.setProperty('--accent-glow', pal.glowColor);
      document.documentElement.style.setProperty('--bg-void', pal.bg);
    }

    // Species Buttons
    const modelCards = document.querySelectorAll('.model-card');
    const speciesLabel = document.getElementById('specimen-model-label');
    modelCards.forEach((card) => {
      card.addEventListener('click', () => {
        const m = card.dataset.model;
        if (!m) return;
        engine.model = m;
        engine.rebuildGeometryIfNeeded(true);
        modelCards.forEach((c) => c.classList.toggle('active', c.dataset.model === m));
        if (speciesLabel) speciesLabel.textContent = card.textContent.trim();
        audio.playChime(0, 0.45);
      });
    });

    // Palette Cycle Button
    const btnPalette = document.getElementById('btn-palette');
    if (btnPalette) {
      btnPalette.addEventListener('click', () => {
        paletteIdx = (paletteIdx + 1) % paletteKeys.length;
        const key = paletteKeys[paletteIdx];
        engine.paletteKey = key;
        applyThemeAccent(key);
        showToast(RoseRenderer.PALETTES[key].name);
      });
    }

    // Bloom Slider
    const bloomSlider = document.getElementById('slider-bloom');
    if (bloomSlider) {
      bloomSlider.addEventListener('input', () => {
        const v = parseFloat(bloomSlider.value);
        state.targetBloom = v;
        engine.bloom = v;
      });
    }

    // Wind Gust
    function triggerGustAction() {
      engine.triggerWindGust(12);
      audio.playWindCascade();
    }
    const btnGust = document.getElementById('btn-wind-gust');
    if (btnGust) btnGust.addEventListener('click', triggerGustAction);

    // Synth Toggle (Default: ON, unlocks on first gesture)
    const btnAudio = document.getElementById('btn-audio');
    let synthWanted = true;
    function syncAudioButton(active) {
      if (!btnAudio) return;
      btnAudio.classList.toggle('active', active);
      btnAudio.textContent = active ? '🔊' : '🔇';
    }
    syncAudioButton(true);

    function unlockAudioOnGesture() {
      if (synthWanted && !audio.isPlaying) {
        const started = audio.toggle();
        syncAudioButton(started);
      }
      if (audio.isPlaying || !synthWanted) {
        window.removeEventListener('pointerdown', unlockAudioOnGesture);
        window.removeEventListener('keydown', unlockAudioOnGesture);
      }
    }
    window.addEventListener('pointerdown', unlockAudioOnGesture, { passive: true });
    window.addEventListener('keydown', unlockAudioOnGesture, { passive: true });

    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const active = audio.toggle();
        synthWanted = active;
        syncAudioButton(active);
        showToast(active ? 'Synth ON' : 'Synth OFF');
      });
    }

    // Zen Mode Toggle (Default: ON)
    document.body.classList.add('zen-mode');
    function toggleZenMode() {
      document.body.classList.toggle('zen-mode');
    }
    const btnZen = document.getElementById('btn-zen');
    const btnZenExit = document.getElementById('btn-zen-exit');
    if (btnZen) btnZen.addEventListener('click', toggleZenMode);
    if (btnZenExit) btnZenExit.addEventListener('click', toggleZenMode);

    // 3D Orbit Camera & Multi-Touch Pinch-Zoom
    const activePointers = new Map();
    let lastPinchDist = 0;

    viewport.addEventListener('pointerdown', (e) => {
      const pid = typeof e.pointerId === 'number' ? e.pointerId : 0;
      activePointers.set(pid, { x: e.clientX, y: e.clientY });

      state.isDragging = true;
      engine.pointerDragging = true;
      state.dragMode = (e.shiftKey || e.button === 2) ? 'pan' : 'orbit';
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
      state.velYaw = 0;
      state.velPitch = 0;

      if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        lastPinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      }

      if (viewport.setPointerCapture && typeof e.pointerId === 'number') {
        try {
          viewport.setPointerCapture(e.pointerId);
        } catch (err) {
          // Ignore synthetic pointerId
        }
      }
    });

    viewport.addEventListener('pointermove', (e) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      engine.pointerX = (e.clientX / w) * 2 - 1;
      engine.pointerY = (e.clientY / h) * 2 - 1;
      engine.pointerActive = true;

      if (!state.isDragging) return;

      const pid = typeof e.pointerId === 'number' ? e.pointerId : 0;
      if (activePointers.size >= 2 && activePointers.has(pid)) {
        activePointers.set(pid, { x: e.clientX, y: e.clientY });
        const pts = Array.from(activePointers.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        if (lastPinchDist > 5 && dist > 5) {
          const pinchDelta = (lastPinchDist - dist) * 0.0085;
          engine.camDist = RoseMath.clamp(engine.camDist + pinchDelta, 1.45, 5.8);
        }
        lastPinchDist = dist;
        return;
      }

      const prev = activePointers.get(pid);
      const refX = prev ? prev.x : state.lastMouseX;
      const refY = prev ? prev.y : state.lastMouseY;
      const dx = e.clientX - refX;
      const dy = e.clientY - refY;

      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
      if (activePointers.has(pid)) {
        activePointers.set(pid, { x: e.clientX, y: e.clientY });
      }

      if (state.dragMode === 'pan') {
        engine.camPanX = RoseMath.clamp(engine.camPanX + dx * 0.0035, -1.2, 1.2);
        engine.camPanY = RoseMath.clamp(engine.camPanY - dy * 0.0035, -1.2, 1.2);
      } else {
        const dYaw = dx * 0.0075;
        const dPitch = dy * 0.0065;
        engine.camYaw += dYaw;
        engine.camPitch = RoseMath.clamp(engine.camPitch + dPitch, -1.15, 1.25);
        state.velYaw = dYaw;
        state.velPitch = dPitch;
      }
    });

    function endDrag(e) {
      const pid = e && typeof e.pointerId === 'number' ? e.pointerId : null;
      if (pid !== null) {
        activePointers.delete(pid);
      } else {
        activePointers.clear();
      }
      if (activePointers.size < 2) lastPinchDist = 0;
      if (activePointers.size === 1) {
        const remaining = Array.from(activePointers.values())[0];
        state.lastMouseX = remaining.x;
        state.lastMouseY = remaining.y;
      } else if (activePointers.size === 0) {
        state.isDragging = false;
        engine.pointerDragging = false;
      }
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('pointerleave', () => {
      engine.pointerActive = false;
    });
    viewport.addEventListener('contextmenu', (e) => e.preventDefault());

    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      engine.camDist = RoseMath.clamp(engine.camDist + e.deltaY * 0.0018, 1.45, 5.8);
    }, { passive: false });

    viewport.addEventListener('dblclick', () => {
      triggerGustAction();
      engine.camPanX = 0;
      engine.camPanY = 0.18;
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      const k = e.key.toLowerCase();
      if (k === 'h' || k === 'z') {
        toggleZenMode();
      } else if (k === 'escape') {
        document.body.classList.remove('zen-mode');
      } else if (k === ' ') {
        e.preventDefault();
        state.isPlaying = !state.isPlaying;
      } else if (k === 'w' || k === 'g') {
        triggerGustAction();
      } else if (k === 'm' && btnAudio) {
        btnAudio.click();
      } else if (k === 'r') {
        engine.camYaw = 0.35;
        engine.camPitch = 0.28;
        engine.camDist = 3.25;
        engine.camPanX = 0;
        engine.camPanY = 0.18;
      } else if (k >= '1' && k <= '5') {
        const idx = parseInt(k, 10) - 1;
        if (modelCards[idx]) modelCards[idx].click();
      }
    });

    // 60 FPS Main Loop
    function animate(now) {
      requestAnimationFrame(animate);

      const rawDt = (now - state.lastFrameTime) / 1000;
      state.lastFrameTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.1);

      if (state.isPlaying) {
        state.elapsedTime += dt;
        if (!state.isDragging) {
          engine.camYaw += state.rotSpeed * 0.45 * dt + state.velYaw;
          engine.camPitch = RoseMath.clamp(engine.camPitch + state.velPitch, -1.15, 1.25);
          state.velYaw *= Math.pow(0.06, dt);
          state.velPitch *= Math.pow(0.06, dt);
        }
        engine.stepPhysics(dt, state.elapsedTime);
      }

      const bloomDelta = state.targetBloom - engine.bloom;
      if (Math.abs(bloomDelta) > 1e-4) {
        engine.bloom += bloomDelta * Math.min(1, dt * 5.5);
        if (bloomSlider) bloomSlider.value = engine.bloom.toFixed(2);
      }

      engine.audioEnergy = audio.update(dt, engine.bloom, engine.windStrength);
      engine.renderFrame(state.elapsedTime);
      engine.drawToCanvas(ctx, canvas.width, canvas.height);
    }

    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
