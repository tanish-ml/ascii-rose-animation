/**
 * ROSA MATHEMATICA — Interactive Single-Page Application Controller
 * Connects the 3D Z-buffered ASCII Rose Engine, Procedural WebAudio Synthesizer,
 * High-DPI Canvas Viewport, Orbit Camera with Inertia, and Editorial HUD.
 */
(function () {
  'use strict';

  const RoseMath = window.AsciiRoseMath;
  const RoseRenderer = window.AsciiRoseRenderer;
  const RoseAudio = window.AsciiRoseAudio;

  const POETIC_PHASES = [
    {
      maxBloom: 0.32,
      id: 'bud',
      label: 'PHASE I — GEMMA (CLOSED SPIRAL BUD)',
      verse: '“In the dark geometry of the calyx, twenty-four whorls await the sun.”'
    },
    {
      maxBloom: 0.76,
      id: 'unfurl',
      label: 'PHASE II — ANTHESIS (LOGARITHMIC UNFURLING)',
      verse: '“Each petal obeys the golden angle, parting velvet shadow into crimson light.”'
    },
    {
      maxBloom: 1.04,
      id: 'full',
      label: 'PHASE III — CORONA (FULL MATHEMATICAL BLOOM)',
      verse: '“A rose is a rose is a parametric surface suspended in phosphor.”'
    },
    {
      maxBloom: 9.9,
      id: 'overbloom',
      label: 'PHASE IV — DEFLORATIO (AUTUMNAL DRIFT)',
      verse: '“Outer petals detach into the Z-buffer, tumbling like embers through terminal night.”'
    }
  ];

  const PALETTE_SWATCH_COLORS = {
    crimson: 'linear-gradient(135deg, #ff2a5f, #22c55e)',
    biolum: 'linear-gradient(135deg, #00f5d4, #7b2cbf)',
    gold: 'linear-gradient(135deg, #ffd166, #9c6615)',
    sakura: 'linear-gradient(135deg, #ff9ebb, #b8c0ff)',
    phosphor: 'linear-gradient(135deg, #20ff66, #064e22)',
    baccara: 'linear-gradient(135deg, #e6193c, #1a0206)',
    solar: 'linear-gradient(135deg, #fff36b, #ff3c00, #480ca8)',
    sumie: 'linear-gradient(135deg, #e84430, #d4d2c8)'
  };

  function initApp() {
    const canvas = document.getElementById('ascii-canvas');
    const viewport = document.getElementById('viewport-container');
    if (!canvas || !viewport) return;

    const ctx = canvas.getContext('2d', { alpha: false });

    // Initialize 3D ASCII Engine & WebAudio Synth
    const engine = new RoseRenderer.AsciiRoseEngine({
      cols: 130,
      rows: 72,
      model: 'cortes',
      palette: 'crimson',
      ramp: 'botanical',
      bloom: 0.92,
      density: 1.0,
      thornDetail: 0.78,
      windStrength: 0.35,
      glowIntensity: 0.65,
      scanlines: true
    });

    const audio = new RoseAudio.BotanicalAudioEngine();

    // Application animation state
    const state = {
      isPlaying: true,
      autoBloom: false,
      bloomCycleTime: 2.1, // Starts near full bloom when toggled
      targetBloom: 0.92,
      rotSpeed: 0.42,
      baseCols: 130,
      isDragging: false,
      dragMode: 'orbit', // 'orbit' | 'pan'
      lastMouseX: 0,
      lastMouseY: 0,
      velYaw: 0,
      velPitch: 0,
      elapsedTime: 0,
      lastFrameTime: performance.now(),
      fpsSmooth: 60,
      frameCounter: 0
    };

    // Expose for automated verification & debugging
    window.__ROSA_APP__ = { engine, audio, state };

    // ========================================================================
    // VIEWPORT SIZING & GRID RESOLUTION
    // ========================================================================
    function updateCanvasAndGridSize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      const charAspect = 0.52;
      const cols = state.baseCols;
      const rows = Math.max(24, Math.round((cols * (h / Math.max(1, w))) / charAspect));
      engine.resizeGrid(cols, rows);
    }

    window.addEventListener('resize', updateCanvasAndGridSize);
    updateCanvasAndGridSize();

    // ========================================================================
    // UI ELEMENT BINDINGS
    // ========================================================================
    const toastEl = document.getElementById('toast-notification');
    let toastTimer = null;
    function showToast(msg) {
      if (!toastEl) return;
      toastEl.textContent = msg;
      toastEl.classList.add('visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastEl.classList.remove('visible');
      }, 2400);
    }

    function applyThemeAccent(paletteKey) {
      const pal = RoseRenderer.PALETTES[paletteKey] || RoseRenderer.PALETTES.crimson;
      document.documentElement.style.setProperty('--accent', pal.accent);
      document.documentElement.style.setProperty('--accent-glow', pal.glowColor);
      document.documentElement.style.setProperty('--bg-void', pal.bg);
    }

    // Populate Palette Swatches
    const paletteGrid = document.getElementById('palette-grid');
    if (paletteGrid) {
      paletteGrid.innerHTML = '';
      Object.keys(RoseRenderer.PALETTES).forEach((key) => {
        const pal = RoseRenderer.PALETTES[key];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'palette-swatch' + (key === engine.paletteKey ? ' active' : '');
        btn.dataset.palette = key;
        const shortName = pal.name.split(' ')[0];
        btn.innerHTML = `
          <span class="swatch-dot" style="background: ${PALETTE_SWATCH_COLORS[key] || pal.accent}"></span>
          <span>${shortName}</span>
        `;
        btn.addEventListener('click', () => {
          engine.paletteKey = key;
          applyThemeAccent(key);
          paletteGrid.querySelectorAll('.palette-swatch').forEach((el) => {
            el.classList.toggle('active', el.dataset.palette === key);
          });
        });
        paletteGrid.appendChild(btn);
      });
    }

    // Model Selector Cards
    const modelCards = document.querySelectorAll('.model-card');
    modelCards.forEach((card) => {
      card.addEventListener('click', () => {
        const m = card.dataset.model;
        if (!m) return;
        engine.model = m;
        engine.rebuildGeometryIfNeeded(true);
        modelCards.forEach((c) => c.classList.toggle('active', c.dataset.model === m));
        const subEl = document.getElementById('specimen-model-label');
        if (subEl) subEl.textContent = card.querySelector('.model-name').textContent;
        audio.playChime(0, 0.45);
      });
    });

    // Glyph Ramp Select
    const rampSelect = document.getElementById('ramp-select');
    if (rampSelect) {
      rampSelect.addEventListener('change', (e) => {
        engine.rampKey = e.target.value;
      });
    }

    // Sliders
    function bindSlider(sliderId, valId, formatFn, onChange) {
      const slider = document.getElementById(sliderId);
      const valEl = document.getElementById(valId);
      if (!slider) return;
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        if (valEl) valEl.textContent = formatFn(v);
        onChange(v);
      });
    }

    const bloomSlider = document.getElementById('slider-bloom');
    const bloomValEl = document.getElementById('val-bloom');
    const autoBloomCheckbox = document.getElementById('toggle-autobloom');

    bindSlider('slider-bloom', 'val-bloom', (v) => `${Math.round(v * 100)}%`, (v) => {
      state.targetBloom = v;
      engine.bloom = v;
      if (state.autoBloom && autoBloomCheckbox) {
        state.autoBloom = false;
        autoBloomCheckbox.checked = false;
      }
      updatePhaseUI(v);
    });

    bindSlider('slider-cols', 'val-cols', (v) => `${Math.round(v)} cols`, (v) => {
      state.baseCols = Math.round(v);
      updateCanvasAndGridSize();
    });

    bindSlider('slider-rotspeed', 'val-rotspeed', (v) => `${v.toFixed(1)}x`, (v) => {
      state.rotSpeed = v;
    });

    bindSlider('slider-wind', 'val-wind', (v) => `${Math.round(v * 100)}%`, (v) => {
      engine.windStrength = v;
    });

    bindSlider('slider-thorns', 'val-thorns', (v) => `${Math.round(v * 100)}%`, (v) => {
      engine.thornDetail = v;
    });

    bindSlider('slider-glow', 'val-glow', (v) => `${Math.round(v * 100)}%`, (v) => {
      engine.glowIntensity = v;
    });

    if (autoBloomCheckbox) {
      autoBloomCheckbox.addEventListener('change', (e) => {
        state.autoBloom = e.target.checked;
      });
    }

    const scanlinesCheckbox = document.getElementById('toggle-scanlines');
    if (scanlinesCheckbox) {
      scanlinesCheckbox.addEventListener('change', (e) => {
        engine.scanlines = e.target.checked;
      });
    }

    // Bottom Lifecycle Phase Preset Buttons
    const phaseButtons = document.querySelectorAll('.phase-btn[data-bloom]');
    phaseButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = parseFloat(btn.dataset.bloom);
        state.autoBloom = false;
        if (autoBloomCheckbox) autoBloomCheckbox.checked = false;
        state.targetBloom = target;
        if (target > 1.05) {
          engine.triggerWindGust(12);
          audio.playWindCascade();
        } else {
          audio.playChime(0, 0.5);
        }
      });
    });

    function updatePhaseUI(bloomVal) {
      let currentPhase = POETIC_PHASES[2];
      for (let i = 0; i < POETIC_PHASES.length; i++) {
        if (bloomVal <= POETIC_PHASES[i].maxBloom) {
          currentPhase = POETIC_PHASES[i];
          break;
        }
      }
      const labelEl = document.getElementById('phase-label');
      const verseEl = document.getElementById('phase-verse');
      if (labelEl && labelEl.textContent !== currentPhase.label) {
        labelEl.textContent = currentPhase.label;
      }
      if (verseEl && verseEl.textContent !== currentPhase.verse) {
        verseEl.textContent = currentPhase.verse;
      }

      phaseButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.phaseId === currentPhase.id);
      });
    }

    // Play/Pause Button
    const btnPlayPause = document.getElementById('btn-play-pause');
    if (btnPlayPause) {
      btnPlayPause.addEventListener('click', () => {
        state.isPlaying = !state.isPlaying;
        btnPlayPause.textContent = state.isPlaying ? '⏸ Pause' : '▶ Resume';
      });
    }

    // Wind Gust Button
    function triggerGustAction() {
      engine.triggerWindGust(14);
      audio.playWindCascade();
      showToast('🌬️ Wind gust released 14 tumbling 3D petals');
    }

    const btnGust = document.getElementById('btn-wind-gust');
    if (btnGust) btnGust.addEventListener('click', triggerGustAction);

    // Audio Synth Toggle Button
    const btnAudio = document.getElementById('btn-audio');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const active = audio.toggle();
        btnAudio.classList.toggle('active', active);
        btnAudio.textContent = active ? '🔊 Synth: ON' : '🔈 Synth: OFF';
        showToast(active ? '🔊 Generative Lydian botanical synth active' : '🔈 Ambient synth muted');
      });
    }

    // Copy Raw ASCII Button
    function copyCurrentAscii() {
      const asciiText = engine.toAsciiString(true);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(asciiText).then(() => {
          showToast(`📋 Copied ${engine.cols}×${engine.rows} ASCII Rose to clipboard!`);
        }).catch(() => {
          showToast('📋 ASCII frame ready in Raw ASCII Inspector');
        });
      } else {
        showToast('📋 ASCII frame ready in Raw ASCII Inspector');
      }
    }

    const btnCopyAscii = document.getElementById('btn-copy-ascii');
    if (btnCopyAscii) btnCopyAscii.addEventListener('click', copyCurrentAscii);

    // Save PNG Snapshot Button
    const btnSavePng = document.getElementById('btn-save-png');
    if (btnSavePng) {
      btnSavePng.addEventListener('click', () => {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `rosa-mathematica-${engine.model}-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
          showToast('🖼️ Exported high-DPI PNG artwork');
        } catch (err) {
          showToast('Unable to export PNG');
        }
      });
    }

    // Toggle Right Control Dock
    const controlDock = document.getElementById('control-dock');
    const btnToggleDock = document.getElementById('btn-toggle-dock');
    if (btnToggleDock && controlDock) {
      btnToggleDock.addEventListener('click', () => {
        const collapsed = controlDock.classList.toggle('collapsed');
        btnToggleDock.classList.toggle('active', !collapsed);
      });
    }

    // Zen Mode Toggle
    function toggleZenMode() {
      const isZen = document.body.classList.toggle('zen-mode');
      if (isZen) showToast('👁️ Zen Mode — Press [H] or [Esc] to restore HUD');
    }

    const btnZen = document.getElementById('btn-zen');
    const btnZenExit = document.getElementById('btn-zen-exit');
    if (btnZen) btnZen.addEventListener('click', toggleZenMode);
    if (btnZenExit) btnZenExit.addEventListener('click', toggleZenMode);

    // Modals (Equations & Raw ASCII Inspector)
    const mathModal = document.getElementById('modal-math');
    const asciiModal = document.getElementById('modal-ascii');
    const rawAsciiPre = document.getElementById('raw-ascii-output');

    const btnOpenMath = document.getElementById('btn-open-math');
    const btnCloseMath = document.getElementById('btn-close-math');
    if (btnOpenMath && mathModal) {
      btnOpenMath.addEventListener('click', () => {
        mathModal.classList.add('open');
      });
    }
    if (btnCloseMath && mathModal) {
      btnCloseMath.addEventListener('click', () => mathModal.classList.remove('open'));
    }

    const btnOpenAscii = document.getElementById('btn-open-ascii');
    const btnCloseAscii = document.getElementById('btn-close-ascii');
    const btnModalCopyAscii = document.getElementById('btn-modal-copy-ascii');
    const btnModalDownloadTxt = document.getElementById('btn-modal-download-txt');

    if (btnOpenAscii && asciiModal) {
      btnOpenAscii.addEventListener('click', () => {
        if (rawAsciiPre) {
          rawAsciiPre.textContent = engine.toAsciiString(true);
        }
        asciiModal.classList.add('open');
      });
    }
    if (btnCloseAscii && asciiModal) {
      btnCloseAscii.addEventListener('click', () => asciiModal.classList.remove('open'));
    }
    if (btnModalCopyAscii) {
      btnModalCopyAscii.addEventListener('click', copyCurrentAscii);
    }
    if (btnModalDownloadTxt) {
      btnModalDownloadTxt.addEventListener('click', () => {
        const blob = new Blob([engine.toAsciiString(true)], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rosa-mathematica-${engine.model}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('📄 Downloaded .TXT ASCII rose frame');
      });
    }

    // Close modals on backdrop click
    [mathModal, asciiModal].forEach((modal) => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    });

    // ========================================================================
    // 3D ORBIT CAMERA, ZOOM & CURSOR WIND INTERACTION
    // ========================================================================
    viewport.addEventListener('pointerdown', (e) => {
      state.isDragging = true;
      state.dragMode = (e.shiftKey || e.button === 2) ? 'pan' : 'orbit';
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
      state.velYaw = 0;
      state.velPitch = 0;
      viewport.setPointerCapture(e.pointerId);
    });

    viewport.addEventListener('pointermove', (e) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      engine.pointerX = (e.clientX / w) * 2 - 1;
      engine.pointerY = (e.clientY / h) * 2 - 1;
      engine.pointerActive = true;

      if (!state.isDragging) return;

      const dx = e.clientX - state.lastMouseX;
      const dy = e.clientY - state.lastMouseY;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;

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

    function endDrag() {
      state.isDragging = false;
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('pointerleave', () => {
      engine.pointerActive = false;
    });

    viewport.addEventListener('contextmenu', (e) => e.preventDefault());

    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.0018;
      engine.camDist = RoseMath.clamp(engine.camDist + zoomDelta, 1.45, 5.8);
    }, { passive: false });

    viewport.addEventListener('dblclick', () => {
      engine.triggerWindGust(12);
      audio.playWindCascade();
      engine.camPanX = 0;
      engine.camPanY = 0.18;
      showToast('✨ Petal burst & camera recentered');
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      const k = e.key.toLowerCase();
      if (k === 'h' || k === 'z') {
        toggleZenMode();
      } else if (k === 'escape') {
        document.body.classList.remove('zen-mode');
        if (mathModal) mathModal.classList.remove('open');
        if (asciiModal) asciiModal.classList.remove('open');
      } else if (k === ' ') {
        e.preventDefault();
        if (btnPlayPause) btnPlayPause.click();
      } else if (k === 'w' || k === 'g') {
        triggerGustAction();
      } else if (k === 'm') {
        if (btnAudio) btnAudio.click();
      } else if (k === 'c' && !e.ctrlKey && !e.metaKey) {
        copyCurrentAscii();
      } else if (k === 'r') {
        engine.camYaw = 0.35;
        engine.camPitch = 0.28;
        engine.camDist = 3.25;
        engine.camPanX = 0;
        engine.camPanY = 0.18;
        showToast('🎥 Camera reset to canonical botanical view');
      } else if (k === '1' && modelCards[0]) {
        modelCards[0].click();
      } else if (k === '2' && modelCards[1]) {
        modelCards[1].click();
      } else if (k === '3' && modelCards[2]) {
        modelCards[2].click();
      }
    });

    // ========================================================================
    // TELEMETRY DOM ELEMENTS
    // ========================================================================
    const statFps = document.getElementById('stat-fps');
    const statGrid = document.getElementById('stat-grid');
    const statGlyphs = document.getElementById('stat-glyphs');
    const statVertices = document.getElementById('stat-vertices');
    const statCam = document.getElementById('stat-cam');

    // ========================================================================
    // MAIN 60FPS ANIMATION LOOP
    // ========================================================================
    function animate(now) {
      requestAnimationFrame(animate);

      const rawDt = (now - state.lastFrameTime) / 1000;
      state.lastFrameTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.1);

      const instFps = 1 / Math.max(0.001, rawDt);
      state.fpsSmooth = state.fpsSmooth * 0.92 + instFps * 0.08;

      if (state.isPlaying) {
        state.elapsedTime += dt;

        // Orbit turntable & inertia
        if (!state.isDragging) {
          engine.camYaw += state.rotSpeed * 0.45 * dt + state.velYaw;
          engine.camPitch = RoseMath.clamp(engine.camPitch + state.velPitch, -1.15, 1.25);
          state.velYaw *= Math.pow(0.06, dt);
          state.velPitch *= Math.pow(0.06, dt);
        }

        // Lifecycle Auto-Bloom or smooth target interpolation
        if (state.autoBloom) {
          state.bloomCycleTime += dt * 0.28;
          // Smooth breathing wave between tight bud (0.08) and full over-bloom (1.14)
          const wave = 0.5 - 0.5 * Math.cos(state.bloomCycleTime);
          state.targetBloom = 0.08 + Math.pow(wave, 0.85) * 1.06;
          if (bloomSlider) bloomSlider.value = state.targetBloom.toFixed(2);
          if (bloomValEl) bloomValEl.textContent = `${Math.round(state.targetBloom * 100)}%`;
        }

        engine.bloom += (state.targetBloom - engine.bloom) * Math.min(1, dt * 5.5);
        updatePhaseUI(engine.bloom);

        // Step 3D falling petals & rising pollen physics
        engine.stepPhysics(dt, state.elapsedTime);
      }

      // Update WebAudio synthesizer & get harmonic energy
      engine.audioEnergy = audio.update(dt, engine.bloom, engine.windStrength);

      // Render 3D scene to Z-buffered ASCII grid & paint to High-DPI Canvas
      const stats = engine.renderFrame(state.elapsedTime);
      engine.drawToCanvas(ctx, canvas.width, canvas.height);

      // Update telemetry readout every 8 frames
      state.frameCounter++;
      if (state.frameCounter % 8 === 0) {
        if (statFps) statFps.textContent = `${Math.round(state.fpsSmooth)}`;
        if (statGrid) statGrid.textContent = `${engine.cols}×${engine.rows}`;
        if (statGlyphs) statGlyphs.textContent = stats.activeCells.toLocaleString();
        if (statVertices) statVertices.textContent = stats.vertexCount.toLocaleString();
        if (statCam) {
          const degYaw = Math.round(((engine.camYaw * 180) / Math.PI) % 360);
          const degPitch = Math.round((engine.camPitch * 180) / Math.PI);
          statCam.textContent = `${degYaw}° / ${degPitch}°`;
        }
      }
    }

    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
