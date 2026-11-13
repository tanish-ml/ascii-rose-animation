/**
 * ROSA MATHEMATICA — 3D Z-Buffered Directional ASCII Rasterizer & Particle Physics Engine
 * Features:
 * - True 3D perspective camera (yaw, pitch, roll, zoom, pan)
 * - Two-sided PBR-inspired normal lighting (key light, rim light, velvet crease AO, specular dewdrops)
 * - Petal-layer discontinuity detection (highlights overlapping petal rims & selects directional glyphs)
 * - 3D tumbling falling rose petals (curved 3D patches rasterized in the same Z-buffer)
 * - Bioluminescent rising pollen particles & interactive cursor wind field
 * - High-DPI Canvas2D rendering with phosphor bloom, CRT scanlines, & chromatic aberration
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const math = require('./rose-math.js');
    module.exports = factory(math);
  } else {
    root.AsciiRoseRenderer = factory(root.AsciiRoseMath);
  }
})(typeof self !== 'undefined' ? self : this, function (RoseMath) {
  'use strict';

  const clamp = RoseMath.clamp;
  const lerp = RoseMath.lerp;

  // ============================================================================
  // CURATED COLOR PALETTES
  // ============================================================================
  const PALETTES = {
    crimson: {
      name: 'Crimson Velvet',
      bg: '#060307',
      bgRgb: [6, 3, 7],
      glowColor: 'rgba(255, 38, 82, 0.35)',
      accent: '#ff3366',
      transformColor(r, g, b, part, lum, rim, spec) {
        if (part === 'petal') {
          return [
            clamp(Math.round((r * 248 + rim * 75 + spec * 150) * (0.38 + 0.86 * lum)), 28, 255),
            clamp(Math.round((g * 155 + rim * 42 + spec * 175) * (0.24 + 0.85 * lum)), 6, 248),
            clamp(Math.round((b * 195 + rim * 62 + spec * 185) * (0.28 + 0.85 * lum)), 14, 252)
          ];
        }
        if (part === 'stamen') {
          return [
            clamp(Math.round(255 * lum + spec * 95), 75, 255),
            clamp(Math.round(215 * lum + spec * 85), 50, 255),
            clamp(Math.round(75 * lum + spec * 95), 18, 230)
          ];
        }
        if (part === 'thorn') {
          return [
            clamp(Math.round((r * 225 + rim * 55) * (0.25 + 0.85 * lum)), 35, 245),
            clamp(Math.round((g * 155 + rim * 35) * (0.25 + 0.85 * lum)), 20, 205),
            clamp(Math.round((b * 130) * (0.25 + 0.85 * lum)), 12, 165)
          ];
        }
        // stem, sepal, leaf
        return [
          clamp(Math.round((r * 175 + rim * 40 + spec * 65) * (0.34 + 0.82 * lum)), 12, 220),
          clamp(Math.round((g * 240 + rim * 65 + spec * 85) * (0.36 + 0.85 * lum)), 28, 255),
          clamp(Math.round((b * 165 + rim * 40 + spec * 65) * (0.30 + 0.80 * lum)), 14, 210)
        ];
      }
    },

    biolum: {
      name: 'Midnight Bioluminescence',
      bg: '#02060d',
      bgRgb: [2, 6, 13],
      glowColor: 'rgba(0, 245, 212, 0.4)',
      accent: '#00f5d4',
      transformColor(r, g, b, part, lum, rim, spec) {
        if (part === 'petal' || part === 'stamen') {
          const t = clamp(r * 0.8 + rim * 0.4, 0, 1);
          return [
            clamp(Math.round((lerp(45, 190, 1 - t) + rim * 90 + spec * 150) * lum), 10, 255),
            clamp(Math.round((lerp(90, 250, t) + rim * 70 + spec * 140) * lum), 25, 255),
            clamp(Math.round((255 + spec * 100) * (0.35 + 0.78 * lum)), 45, 255)
          ];
        }
        return [
          clamp(Math.round((20 + rim * 40) * lum), 5, 160),
          clamp(Math.round((g * 230 + rim * 65 + spec * 80) * lum), 20, 255),
          clamp(Math.round((g * 195 + rim * 75 + spec * 90) * lum), 25, 245)
        ];
      }
    },

    gold: {
      name: "Alchemist's Gold",
      bg: '#070503',
      bgRgb: [7, 5, 3],
      glowColor: 'rgba(255, 196, 64, 0.35)',
      accent: '#ffc440',
      transformColor(r, g, b, part, lum, rim, spec) {
        if (part === 'petal' || part === 'stamen') {
          return [
            clamp(Math.round((250 * r + rim * 65 + spec * 130) * (0.32 + 0.82 * lum)), 28, 255),
            clamp(Math.round((178 * r + rim * 55 + spec * 125) * (0.25 + 0.82 * lum)), 16, 250),
            clamp(Math.round((52 * r + rim * 40 + spec * 145) * (0.18 + 0.82 * lum)), 5, 235)
          ];
        }
        return [
          clamp(Math.round((125 * g + rim * 35) * lum), 15, 195),
          clamp(Math.round((155 * g + rim * 45) * lum), 20, 215),
          clamp(Math.round((85 * g + rim * 25) * lum), 10, 155)
        ];
      }
    },

    sakura: {
      name: 'Ghost Sakura',
      bg: '#07050a',
      bgRgb: [7, 5, 10],
      glowColor: 'rgba(255, 166, 209, 0.35)',
      accent: '#ff9ebb',
      transformColor(r, g, b, part, lum, rim, spec) {
        if (part === 'petal' || part === 'stamen') {
          return [
            clamp(Math.round((255 * (0.55 + 0.45 * r) + spec * 90) * (0.32 + 0.78 * lum)), 35, 255),
            clamp(Math.round((165 * r + rim * 75 + spec * 120) * (0.28 + 0.78 * lum)), 20, 248),
            clamp(Math.round((205 * r + rim * 80 + spec * 130) * (0.32 + 0.78 * lum)), 30, 255)
          ];
        }
        return [
          clamp(Math.round((115 * g + rim * 45) * lum), 15, 200),
          clamp(Math.round((195 * g + rim * 55) * lum), 25, 235),
          clamp(Math.round((165 * g + rim * 55) * lum), 20, 220)
        ];
      }
    },

    phosphor: {
      name: 'P1 Phosphor Terminal',
      bg: '#020704',
      bgRgb: [2, 7, 4],
      glowColor: 'rgba(32, 255, 102, 0.4)',
      accent: '#20ff66',
      transformColor(r, g, b, part, lum, rim, spec) {
        const intensity = clamp((part === 'petal' ? r : g) * 0.85 + rim * 0.35 + spec * 0.5, 0.1, 1.2);
        const v = clamp( intensity * (0.28 + 0.85 * lum), 0.08, 1.0);
        return [
          clamp(Math.round(35 * v + spec * 120), 4, 210),
          clamp(Math.round(255 * v + spec * 80), 24, 255),
          clamp(Math.round(95 * v + spec * 110), 10, 225)
        ];
      }
    },

    baccara: {
      name: 'Black Baccara Noir',
      bg: '#040102',
      bgRgb: [4, 1, 2],
      glowColor: 'rgba(220, 12, 42, 0.42)',
      accent: '#e6193c',
      transformColor(r, g, b, part, lum, rim, spec) {
        if (part === 'petal' || part === 'stamen') {
          const edgeBoost = Math.pow(rim, 1.3) * 210 + spec * 160;
          const velvet = Math.pow(lum, 1.35) * r;
          return [
            clamp(Math.round(velvet * 165 + edgeBoost), 12, 255),
            clamp(Math.round(velvet * 14 + edgeBoost * 0.18), 2, 140),
            clamp(Math.round(velvet * 26 + edgeBoost * 0.25), 4, 165)
          ];
        }
        return [
          clamp(Math.round(g * 65 * lum + rim * 30), 6, 130),
          clamp(Math.round(g * 125 * lum + rim * 45), 12, 185),
          clamp(Math.round(g * 75 * lum + rim * 25), 8, 135)
        ];
      }
    },

    solar: {
      name: 'Infrared Thermal',
      bg: '#04020a',
      bgRgb: [4, 2, 10],
      glowColor: 'rgba(255, 110, 30, 0.38)',
      accent: '#ff6e1e',
      transformColor(r, g, b, part, lum, rim, spec) {
        const heat = clamp(
          (part === 'petal' || part === 'stamen' ? r * 0.75 + 0.22 : g * 0.55) * (0.35 + 0.75 * lum) + rim * 0.28 + spec * 0.45,
          0.05,
          1.0
        );
        // Thermal ramp: deep violet -> magenta -> orange -> incandescent yellow-white
        const tr = clamp(Math.round(smoothstep(0.05, 0.55, heat) * 255), 15, 255);
        const tg = clamp(Math.round(smoothstep(0.42, 0.92, heat) * 245), 4, 255);
        const tb = clamp(Math.round((Math.sin(heat * Math.PI * 1.1) * 160 + smoothstep(0.82, 1.0, heat) * 220)), 20, 255);
        return [tr, tg, tb];
      }
    },

    sumie: {
      name: 'Sumi-e & Cinnabar',
      bg: '#0a0908',
      bgRgb: [10, 9, 8],
      glowColor: 'rgba(232, 68, 48, 0.3)',
      accent: '#e84430',
      transformColor(r, g, b, part, lum, rim, spec) {
        if (part === 'petal' || part === 'stamen') {
          const cinnabar = clamp(r * 0.85 + rim * 0.3, 0, 1);
          return [
            clamp(Math.round((235 * cinnabar + spec * 90) * (0.32 + 0.78 * lum)), 28, 255),
            clamp(Math.round((68 * cinnabar + rim * 45 + spec * 110) * (0.28 + 0.78 * lum)), 14, 220),
            clamp(Math.round((52 * cinnabar + rim * 40 + spec * 100) * (0.28 + 0.78 * lum)), 12, 210)
          ];
        }
        // Monochrome warm sumi ink foliage
        const ink = clamp(g * (0.3 + 0.75 * lum) + rim * 0.25, 0.1, 0.95);
        return [
          clamp(Math.round(195 * ink), 20, 225),
          clamp(Math.round(192 * ink), 20, 222),
          clamp(Math.round(180 * ink), 18, 210)
        ];
      }
    }
  };

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // ============================================================================
  // GLYPH RAMPS (Ordered from darkest/sparsest to brightest/densest)
  // ============================================================================
  const GLYPH_RAMPS = {
    botanical: {
      name: 'Botanical Classic',
      chars: ' .·:;~+=*xX$&#@',
      useContours: true
    },
    poetic: {
      name: 'Poetic ("Rose is a rose")',
      chars: ' .·,:;irsaoeulROSE❀✿❁',
      useContours: false
    },
    katakana: {
      name: 'Cyber-Katakana',
      chars: ' .·:+=*ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ',
      useContours: false
    },
    braille: {
      name: 'Braille Stipple',
      chars: ' ⠁⠃⠇⠏⠟⠿⡿⣿',
      useContours: false
    },
    blocks: {
      name: 'ANSI Blocks',
      chars: ' ·░▒▓█',
      useContours: false
    },
    sacred: {
      name: 'Sacred Geometry',
      chars: ' ·∙∘○◌◍◎●◉✦✧★',
      useContours: false
    },
    wireframe: {
      name: 'Architectural Contour',
      chars: '  ..··::;;~~++==**##',
      useContours: true,
      wireframeOnly: true
    }
  };

  const PART_CODES = {
    empty: 0,
    stem: 1,
    thorn: 2,
    leaf: 3,
    sepal: 4,
    petal: 5,
    stamen: 6,
    fallingPetal: 7,
    pollen: 8
  };

  const CODE_TO_PART = [
    'empty',
    'stem',
    'thorn',
    'leaf',
    'sepal',
    'petal',
    'stamen',
    'petal',
    'stamen'
  ];

  // ============================================================================
  // 3D TUMBLING FALLING PETAL & POLLEN PARTICLE SYSTEM
  // ============================================================================
  function createFallingPetal(seed, isBurst) {
    const angle = (seed * 2.39996 + Math.random() * 0.8) % (Math.PI * 2);
    const radius = 0.42 + Math.random() * 0.35;
    return {
      x: Math.cos(angle) * radius,
      y: 0.35 + Math.random() * 0.45,
      z: Math.sin(angle) * radius,
      vx: (Math.cos(angle) * (0.12 + Math.random() * 0.18)) * (isBurst ? 1.8 : 1.0),
      vy: isBurst ? (0.08 + Math.random() * 0.22) : (-0.12 - Math.random() * 0.12),
      vz: (Math.sin(angle) * (0.12 + Math.random() * 0.18)) * (isBurst ? 1.8 : 1.0),
      yaw: angle,
      pitch: 0.4 + Math.random() * 0.8,
      roll: (Math.random() - 0.5) * 1.2,
      vYaw: (Math.random() - 0.5) * 2.4,
      vPitch: (Math.random() - 0.5) * 3.1,
      vRoll: (Math.random() - 0.5) * 2.8,
      flutterPhase: Math.random() * Math.PI * 2,
      flutterSpeed: 3.2 + Math.random() * 2.5,
      size: 0.15 + Math.random() * 0.08,
      age: 0,
      maxAge: 5.5 + Math.random() * 3.5,
      hueShift: (Math.random() - 0.5) * 0.1
    };
  }

  function createPollenParticle() {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.25 + Math.random() * 1.35;
    return {
      x: Math.cos(angle) * radius,
      y: -1.5 + Math.random() * 2.9,
      z: Math.sin(angle) * radius,
      phase: Math.random() * Math.PI * 2,
      speed: 0.12 + Math.random() * 0.22,
      driftRadius: 0.06 + Math.random() * 0.12,
      glyph: ['·', '°', '✦', '✧', '∙', '*'][Math.floor(Math.random() * 6)]
    };
  }

  // ============================================================================
  // MAIN RENDERER CLASS
  // ============================================================================
  class AsciiRoseEngine {
    constructor(options) {
      const opts = options || {};
      this.cols = opts.cols || 120;
      this.rows = opts.rows || 68;

      this.model = opts.model || 'cortes';
      this.paletteKey = opts.palette || 'crimson';
      this.rampKey = opts.ramp || 'botanical';

      this.bloom = typeof opts.bloom === 'number' ? opts.bloom : 0.92;
      this.density = typeof opts.density === 'number' ? opts.density : 1.0;
      this.thornDetail = typeof opts.thornDetail === 'number' ? opts.thornDetail : 0.75;
      this.windStrength = typeof opts.windStrength === 'number' ? opts.windStrength : 0.35;
      this.glowIntensity = typeof opts.glowIntensity === 'number' ? opts.glowIntensity : 0.65;
      this.scanlines = typeof opts.scanlines === 'boolean' ? opts.scanlines : true;

      // Camera spherical / orbit state
      this.camYaw = typeof opts.camYaw === 'number' ? opts.camYaw : 0.35;
      this.camPitch = typeof opts.camPitch === 'number' ? opts.camPitch : 0.28;
      this.camDist = typeof opts.camDist === 'number' ? opts.camDist : 2.95;
      this.camPanX = 0;
      this.camPanY = 0.20; // Center slightly below flower head so full plant is framed
      this.viewportOffsetX = typeof opts.viewportOffsetX === 'number' ? opts.viewportOffsetX : 0;

      // Interactive cursor wind / light in normalized screen coords [-1, 1]
      this.pointerX = 0;
      this.pointerY = 0;
      this.pointerActive = false;
      this.pointerDragging = false;
      this.pointerVx = 0;
      this.pointerVy = 0;

      // Audio reactivity boost [0, 1]
      this.audioEnergy = 0;

      // Cached 3D point cloud (separated into bloom-dependent head & static foliage)
      this.pointCloud = [];
      this._flowerHeadCloud = [];
      this._staticFoliageCloud = [];
      this._cachedHeadKey = '';
      this._cachedFoliageKey = '';

      // Particles
      this.fallingPetals = [];
      this.pollenParticles = [];
      for (let i = 0; i < 65; i++) {
        this.pollenParticles.push(createPollenParticle());
      }
      for (let i = 0; i < 6; i++) {
        const fp = createFallingPetal(i, false);
        fp.age = Math.random() * fp.maxAge;
        fp.y = 0.4 - (fp.age / fp.maxAge) * 2.1;
        this.fallingPetals.push(fp);
      }

      this._allocateBuffers(this.cols, this.rows);
      this.rebuildGeometryIfNeeded();
    }

    _allocateBuffers(cols, rows) {
      this.cols = Math.max(20, Math.min(260, Math.round(cols)));
      this.rows = Math.max(15, Math.min(180, Math.round(rows)));
      const size = this.cols * this.rows;

      this.zBuf = new Float32Array(size);
      this.lumBuf = new Float32Array(size);
      this.rimBuf = new Float32Array(size);
      this.specBuf = new Float32Array(size);
      this.nxBuf = new Float32Array(size);
      this.nyBuf = new Float32Array(size);
      this.rBuf = new Float32Array(size);
      this.gBuf = new Float32Array(size);
      this.bBuf = new Float32Array(size);
      this.partBuf = new Uint8Array(size);
      this.layerBuf = new Int16Array(size);

      // Final frame character & RGB output buffers
      this.charGrid = new Array(size);
      this.colorR = new Uint8Array(size);
      this.colorG = new Uint8Array(size);
      this.colorB = new Uint8Array(size);
      this.shadeRow = new Uint8Array(size);
    }

    resizeGrid(cols, rows) {
      if (cols !== this.cols || rows !== this.rows) {
        this._allocateBuffers(cols, rows);
      }
    }

    rebuildGeometryIfNeeded(force) {
      const quantBloom = Math.round(this.bloom * 120) / 120;
      const gridDensityBoost = this.cols > 135 ? Math.min(1.65, Math.pow(this.cols / 130, 1.15)) : 1.0;
      const quantDensity = Math.round(Math.max(this.density, gridDensityBoost) * 20) / 20;
      const quantThorn = Math.round(this.thornDetail * 20) / 20;

      const foliageKey = `${quantDensity}|${quantThorn}`;
      const headKey = `${this.model}|${quantBloom}|${quantDensity}|${quantThorn}`;

      let changed = false;

      if (force || foliageKey !== this._cachedFoliageKey || this._staticFoliageCloud.length === 0) {
        this._cachedFoliageKey = foliageKey;
        this._staticFoliageCloud = RoseMath.generateStaticFoliageCloud({
          density: quantDensity,
          thornDetail: quantThorn
        });
        changed = true;
      }

      if (force || headKey !== this._cachedHeadKey || this._flowerHeadCloud.length === 0) {
        this._cachedHeadKey = headKey;
        this._flowerHeadCloud = RoseMath.generateFlowerHeadCloud({
          model: this.model,
          bloom: quantBloom,
          density: quantDensity,
          thornDetail: quantThorn
        });
        changed = true;
      }

      if (changed || this.pointCloud.length === 0) {
        this.pointCloud = this._flowerHeadCloud.concat(this._staticFoliageCloud);
        const n = this.pointCloud.length;
        this._nPts = n;
        this._px = new Float32Array(n);
        this._py = new Float32Array(n);
        this._pz = new Float32Array(n);
        this._pnx = new Float32Array(n);
        this._pny = new Float32Array(n);
        this._pnz = new Float32Array(n);
        this._pr = new Float32Array(n);
        this._pg = new Float32Array(n);
        this._pb = new Float32Array(n);
        this._ppart = new Uint8Array(n);
        this._player = new Int16Array(n);
        this._pv = new Float32Array(n);
        this._pdew = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          const p = this.pointCloud[i];
          this._px[i] = p.x;
          this._py[i] = p.y;
          this._pz[i] = p.z;
          this._pnx[i] = p.nx;
          this._pny[i] = p.ny;
          this._pnz[i] = p.nz;
          this._pr[i] = p.r;
          this._pg[i] = p.g;
          this._pb[i] = p.b;
          this._ppart[i] = PART_CODES[p.part] || PART_CODES.petal;
          this._player[i] = p.layer || 0;
          this._pv[i] = typeof p.v === 'number' ? p.v : 0.75;
          this._pdew[i] = p.isDewdrop ? 1 : 0;
        }
      }
    }

    triggerWindGust(count) {
      const burstCount = count || 10;
      for (let i = 0; i < burstCount; i++) {
        if (this.fallingPetals.length < 36) {
          this.fallingPetals.push(createFallingPetal(i + Math.random() * 10, true));
        }
      }
    }

    stepPhysics(dt, time) {
      const clampedDt = clamp(dt, 0.001, 0.08);
      const wind = this.windStrength;

      // Update falling petals
      const targetPetalCount = Math.max(3, Math.round(wind * 16));
      if (this.fallingPetals.length < targetPetalCount && Math.random() < clampedDt * (1.2 + wind * 3)) {
        this.fallingPetals.push(createFallingPetal(time, false));
      }

      for (let i = this.fallingPetals.length - 1; i >= 0; i--) {
        const fp = this.fallingPetals[i];
        fp.age += clampedDt;
        if (fp.age >= fp.maxAge || fp.y < -1.95) {
          if (this.fallingPetals.length <= targetPetalCount) {
            this.fallingPetals[i] = createFallingPetal(time + i, false);
          } else {
            this.fallingPetals.splice(i, 1);
          }
          continue;
        }

        fp.flutterPhase += fp.flutterSpeed * clampedDt;
        const flutterX = Math.cos(fp.flutterPhase) * 0.22;
        const flutterZ = Math.sin(fp.flutterPhase * 0.8) * 0.18;
        const gustX = (Math.sin(time * 1.1 + fp.y * 2.0) * 0.35 + 0.18) * wind;
        const gustZ = Math.cos(time * 0.85 + fp.x * 2.0) * 0.25 * wind;

        fp.x += (fp.vx + flutterX + gustX) * clampedDt;
        fp.y += (fp.vy - 0.16 * (1 + 0.3 * Math.sin(fp.flutterPhase))) * clampedDt;
        fp.z += (fp.vz + flutterZ + gustZ) * clampedDt;

        // Damping on initial burst velocity
        fp.vx *= Math.pow(0.4, clampedDt);
        fp.vz *= Math.pow(0.4, clampedDt);
        if (fp.vy > -0.15) {
          fp.vy -= 0.65 * clampedDt;
        }

        fp.yaw += fp.vYaw * clampedDt;
        fp.pitch += fp.vPitch * clampedDt;
        fp.roll += fp.vRoll * clampedDt;
      }

      // Update rising pollen particles
      for (let i = 0; i < this.pollenParticles.length; i++) {
        const p = this.pollenParticles[i];
        p.y += p.speed * (1 + wind * 0.8 + this.audioEnergy * 1.2) * clampedDt;
        p.phase += clampedDt * 1.6;
        p.x += Math.cos(p.phase + i) * p.driftRadius * clampedDt;
        p.z += Math.sin(p.phase * 0.9 + i) * p.driftRadius * clampedDt;
        if (p.y > 1.55) {
          p.y = -1.65;
        }
      }
    }

    /**
     * Renders a single 3D frame into the internal ASCII + RGB buffers.
     * Can be called in headless Node.js or browser.
     *
     * @param {number} time - Elapsed time in seconds
     * @returns {Object} Frame telemetry { activeCells, vertexCount, bloom }
     */
    renderFrame(time) {
      const t = typeof time === 'number' ? time : 0;
      this.rebuildGeometryIfNeeded(false);

      const cols = this.cols;
      const rows = this.rows;

      // Clear Z-buffer
      this.zBuf.fill(1e9);
      this.partBuf.fill(0);
      this.layerBuf.fill(-1);
      this.charGrid.fill(' ');
      this.colorR.fill(0);
      this.colorG.fill(0);
      this.colorB.fill(0);

      // Camera rotation matrix (Yaw around Y, then Pitch around X)
      const cosYaw = Math.cos(this.camYaw);
      const sinYaw = Math.sin(this.camYaw);
      const cosPitch = Math.cos(this.camPitch);
      const sinPitch = Math.sin(this.camPitch);

      // Dynamic key light direction in camera space (responsive to pointer if active)
      const lxRaw = this.pointerActive ? clamp(this.pointerX * 1.1, -0.9, 0.9) : Math.sin(t * 0.35) * 0.35 + 0.42;
      const lyRaw = this.pointerActive ? clamp(-this.pointerY * 1.1, -0.9, 0.9) : 0.62;
      const lzRaw = -0.78;
      const lLen = Math.hypot(lxRaw, lyRaw, lzRaw) || 1;
      const lightX = lxRaw / lLen;
      const lightY = lyRaw / lLen;
      const lightZ = lzRaw / lLen;

      // Aspect ratio compensation for monospace characters (typical char cell is ~0.55 width:height)
      const charAspect = 0.55;
      const fovScale = Math.min(cols * charAspect, rows) * 1.02;
      const halfCols = cols * 0.5;
      const halfRows = rows * 0.5;
      const centerCol = cols * (0.5 + (this.viewportOffsetX || 0));
      const centerRow = rows * 0.5;

      // Global wind sway parameters
      const wind = this.windStrength;
      const windSwayX = (Math.sin(t * 1.45) * 0.055 + Math.sin(t * 3.1) * 0.02) * wind;
      const windSwayZ = (Math.cos(t * 1.15) * 0.045 + Math.cos(t * 2.7) * 0.015) * wind;
      const breathScale = 1.0 + Math.sin(t * 1.8) * 0.015 + this.audioEnergy * 0.045;

      const zBuf = this.zBuf;
      const lumBuf = this.lumBuf;
      const rimBuf = this.rimBuf;
      const specBuf = this.specBuf;
      const nxBuf = this.nxBuf;
      const nyBuf = this.nyBuf;
      const rBuf = this.rBuf;
      const gBuf = this.gBuf;
      const bBuf = this.bBuf;
      const partBuf = this.partBuf;
      const layerBuf = this.layerBuf;

      // Helper to project & splat a 3D point + normal into the Z-buffer
      const camDist = this.camDist;
      const panX = this.camPanX;
      const panY = this.camPanY;
      const pointerActive = this.pointerActive && !this.pointerDragging;
      const pointerX = this.pointerX;
      const pointerY = this.pointerY;

      // Precompute half-vector once per frame
      const hxRaw = lightX;
      const hyRaw = lightY;
      const hzRaw = lightZ - 1.0;
      const hLenInv = 1 / (Math.hypot(hxRaw, hyRaw, hzRaw) || 1);
      const hxN = hxRaw * hLenInv;
      const hyN = hyRaw * hLenInv;
      const hzN = hzRaw * hLenInv;

      // Splat size: if grid is dense (>= 80 cols), splat horizontally to prevent monospace aspect gaps
      const useWideSplat = cols >= 80;

      const splatPoint = (wx, wy, wz, nx, ny, nz, r, g, b, partCode, layerId, isDewdrop, vParam) => {
        // Translate by vertical pan
        const pyWorld = wy + panY;
        const pxWorld = wx + panX;
        const pzWorld = wz;

        // Rotate Yaw around Y
        const x1 = pxWorld * cosYaw + pzWorld * sinYaw;
        const z1 = -pxWorld * sinYaw + pzWorld * cosYaw;
        const y1 = pyWorld;

        // Rotate Pitch around X (positive camPitch tilts bloom toward viewer so we look into the rose cup)
        const y2 = y1 * cosPitch + z1 * sinPitch;
        const z2 = -y1 * sinPitch + z1 * cosPitch;
        const x2 = x1;

        const depth = z2 + camDist;
        if (depth < 0.25) return;

        // Perspective projection
        const invZ = fovScale / depth;
        let sx = centerCol + (x2 * invZ) / charAspect;
        let sy = centerRow - y2 * invZ;

        // Subtle organic cursor breeze & shimmer (bounded so it never tears holes in the surface)
        let cursorSpecBoost = 0;
        if (pointerActive && partCode >= PART_CODES.leaf) {
          const ndcX = (sx - halfCols) / halfCols;
          const ndcY = (sy - halfRows) / halfRows;
          const dx = ndcX - pointerX;
          const dy = ndcY - pointerY;
          const d2 = dx * dx + dy * dy;
          if (d2 < 0.12 && d2 > 1e-6) {
            const dist = Math.sqrt(d2);
            const falloff = Math.pow(1 - dist / 0.346, 2);
            const push = falloff * 0.75;
            sx += (dx / dist) * push;
            sy += (dy / dist) * push * 0.65;
            cursorSpecBoost = falloff * 0.28;
          }
        }

        const col = Math.floor(sx);
        const row = Math.floor(sy);
        if (col < 0 || col >= cols || row < 0 || row >= rows) return;

        // Rotate normal into camera space
        const nx1 = nx * cosYaw + nz * sinYaw;
        const nz1 = -nx * sinYaw + nz * cosYaw;
        const ny1 = ny;

        const ny2 = ny1 * cosPitch + nz1 * sinPitch;
        const nz2 = -ny1 * sinPitch + nz1 * cosPitch;
        const nx2 = nx1;

        // Two-sided surface lighting (rose petals are thin translucent membranes)
        const ndotlRaw = nx2 * lightX + ny2 * lightY + nz2 * lightZ;
        const ndotl = Math.abs(ndotlRaw) * 0.74 + Math.max(0, -nz2) * 0.26;

        // Rim / fresnel backlight when surface normal is perpendicular to view vector (0,0,-1)
        const vFactor = typeof vParam === 'number' ? vParam : 0.75;
        const oneMinusNz = 1.0 - Math.abs(nz2);
        const rimBase = oneMinusNz > 0 ? oneMinusNz * oneMinusNz : 0;
        const v2 = vFactor * vFactor;
        const v4 = v2 * v2;
        const rim = clamp(rimBase + v4 * 0.42 + cursorSpecBoost * 0.5, 0, 1);

        // Specular highlight (Blinn-Phong half-vector precomputed once per frame)
        const ndoth = Math.abs(nx2 * hxN + ny2 * hyN + nz2 * hzN);
        const s2 = ndoth * ndoth;
        const s4 = s2 * s2;
        const s16 = s4 * s4 * s4 * s4;
        let spec = s16 * 0.45 + cursorSpecBoost;
        if (isDewdrop) {
          spec = spec > 0.95 ? spec : 0.95;
        }

        // Anatomical velvet ambient occlusion: deep inner petal bases are darker, curled upper lips are luminous
        const ao = partCode === PART_CODES.petal ? (0.48 + 0.52 * Math.sqrt(vFactor)) : 0.88;
        const ambient = 0.22;
        const lum = clamp((ambient + ndotl * 0.72 + rim * 0.34) * ao + spec * 0.58, 0.10, 1.0);

        const idx = row * cols + col;
        if (depth < zBuf[idx]) {
          zBuf[idx] = depth;
          lumBuf[idx] = lum;
          rimBuf[idx] = rim;
          specBuf[idx] = spec;
          nxBuf[idx] = nx2;
          nyBuf[idx] = ny2;
          rBuf[idx] = r;
          gBuf[idx] = g;
          bBuf[idx] = b;
          partBuf[idx] = partCode;
          layerBuf[idx] = layerId;
        }

        // Horizontal sub-pixel fill to prevent gaps on wide monospace grids
        if (useWideSplat && col + 1 < cols && partCode !== PART_CODES.pollen) {
          const idxRight = idx + 1;
          const depthBias = depth + 0.018;
          if (depthBias < zBuf[idxRight]) {
            zBuf[idxRight] = depthBias;
            lumBuf[idxRight] = lum;
            rimBuf[idxRight] = rim;
            specBuf[idxRight] = spec;
            nxBuf[idxRight] = nx2;
            nyBuf[idxRight] = ny2;
            rBuf[idxRight] = r;
            gBuf[idxRight] = g;
            bBuf[idxRight] = b;
            partBuf[idxRight] = partCode;
            layerBuf[idxRight] = layerId;
          }
        }
      };

      // 1. Splat main rose 3D point cloud (tight TypedArray loop)
      const nPts = this._nPts || 0;
      const pxArr = this._px;
      const pyArr = this._py;
      const pzArr = this._pz;
      const pnxArr = this._pnx;
      const pnyArr = this._pny;
      const pnzArr = this._pnz;
      const prArr = this._pr;
      const pgArr = this._pg;
      const pbArr = this._pb;
      const ppartArr = this._ppart;
      const playerArr = this._player;
      const pvArr = this._pv;
      const pdewArr = this._pdew;

      for (let i = 0; i < nPts; i++) {
        const wy = pyArr[i];
        const heightFactor = clamp((wy + 1.64) / 2.6, 0, 1.2);
        const swayWeight = heightFactor * heightFactor;

        let wx = pxArr[i];
        let wz = pzArr[i];
        const pCode = ppartArr[i];

        if (pCode === PART_CODES.petal || pCode === PART_CODES.stamen) {
          wx *= breathScale;
          wz *= breathScale;
        }

        wx += windSwayX * swayWeight;
        wz += windSwayZ * swayWeight;

        splatPoint(
          wx,
          wy,
          wz,
          pnxArr[i],
          pnyArr[i],
          pnzArr[i],
          prArr[i],
          pgArr[i],
          pbArr[i],
          pCode,
          playerArr[i],
          pdewArr[i] === 1,
          pvArr[i]
        );
      }

      // 2. Splat 3D tumbling falling petals (each is a curved 5x5 mini-surface in 3D!)
      for (let f = 0; f < this.fallingPetals.length; f++) {
        const fp = this.fallingPetals[f];
        const cy = Math.cos(fp.yaw);
        const sy = Math.sin(fp.yaw);
        const cp = Math.cos(fp.pitch);
        const sp = Math.sin(fp.pitch);
        const cr = Math.cos(fp.roll);
        const sr = Math.sin(fp.roll);

        const patchN = 5;
        for (let iu = 0; iu < patchN; iu++) {
          const u = (iu / (patchN - 1)) * 2 - 1;
          for (let iv = 0; iv < patchN; iv++) {
            const v = (iv / (patchN - 1)) * 2 - 1;
            if (u * u + v * v > 1.05) continue;

            const lx = u * fp.size;
            const lz = v * fp.size * 0.85;
            const ly = (u * u + v * v) * fp.size * 0.38; // Cupped petal curvature

            // Local normal before rotation
            let lnx = -2 * u * 0.38;
            let lny = 1.0;
            let lnz = -2 * v * 0.38;
            const lnLen = Math.hypot(lnx, lny, lnz) || 1;
            lnx /= lnLen;
            lny /= lnLen;
            lnz /= lnLen;

            // Rotate local point & normal by roll, pitch, yaw
            const rx1 = lx * cr - ly * sr;
            const ry1 = lx * sr + ly * cr;
            const rz1 = lz;

            const ry2 = ry1 * cp - rz1 * sp;
            const rz2 = ry1 * sp + rz1 * cp;
            const rx2 = rx1;

            const rx3 = rx2 * cy + rz2 * sy;
            const rz3 = -rx2 * sy + rz2 * cy;
            const ry3 = ry2;

            // Normal rotation
            const nrx1 = lnx * cr - lny * sr;
            const nry1 = lnx * sr + lny * cr;
            const nrz1 = lnz;
            const nry2 = nry1 * cp - nrz1 * sp;
            const nrz2 = nry1 * sp + nrz1 * cp;
            const nrx3 = nrx1 * cy + nrz2 * sy;
            const nrz3 = -nrx1 * sy + nrz2 * cy;

            splatPoint(
              fp.x + rx3,
              fp.y + ry3,
              fp.z + rz3,
              nrx3,
              nry2,
              nrz3,
              clamp(0.82 + fp.hueShift, 0.4, 1.0),
              0.12,
              0.24,
              PART_CODES.fallingPetal,
              100 + f,
              false,
              0.85
            );
          }
        }
      }

      // 3. Splat rising bioluminescent pollen spores
      for (let i = 0; i < this.pollenParticles.length; i++) {
        const p = this.pollenParticles[i];
        splatPoint(
          p.x,
          p.y,
          p.z,
          0,
          0,
          -1,
          0.95,
          0.85,
          0.45,
          PART_CODES.pollen,
          200 + i,
          true,
          1.0
        );
      }

      // ========================================================================
      // 3.5 SCREEN-SPACE PINHOLE CLOSING PASS (Eliminates 1-cell sampling gaps)
      // ========================================================================
      for (let row = 1; row < rows - 1; row++) {
        const rowOffset = row * cols;
        for (let col = 1; col < cols - 1; col++) {
          const idx = rowOffset + col;
          if (partBuf[idx] !== 0) continue;

          const idxU = idx - cols;
          const idxD = idx + cols;
          const idxL = idx - 1;
          const idxR = idx + 1;

          const pU = partBuf[idxU];
          const pD = partBuf[idxD];
          const pL = partBuf[idxL];
          const pR = partBuf[idxR];

          let srcA = -1;
          let srcB = -1;
          if (pU > 0 && pD > 0 && pU !== PART_CODES.pollen && pD !== PART_CODES.pollen && Math.abs(zBuf[idxU] - zBuf[idxD]) < 0.22) {
            srcA = idxU;
            srcB = idxD;
          } else if (pL > 0 && pR > 0 && pL !== PART_CODES.pollen && pR !== PART_CODES.pollen && Math.abs(zBuf[idxL] - zBuf[idxR]) < 0.22) {
            srcA = idxL;
            srcB = idxR;
          }

          if (srcA !== -1) {
            const pick = zBuf[srcA] <= zBuf[srcB] ? srcA : srcB;
            zBuf[idx] = (zBuf[srcA] + zBuf[srcB]) * 0.5;
            lumBuf[idx] = (lumBuf[srcA] + lumBuf[srcB]) * 0.5;
            rimBuf[idx] = (rimBuf[srcA] + rimBuf[srcB]) * 0.5;
            specBuf[idx] = Math.min(specBuf[srcA], specBuf[srcB]);
            nxBuf[idx] = nxBuf[pick];
            nyBuf[idx] = nyBuf[pick];
            rBuf[idx] = (rBuf[srcA] + rBuf[srcB]) * 0.5;
            gBuf[idx] = (gBuf[srcA] + gBuf[srcB]) * 0.5;
            bBuf[idx] = (bBuf[srcA] + bBuf[srcB]) * 0.5;
            partBuf[idx] = partBuf[pick];
            layerBuf[idx] = layerBuf[pick];
          }
        }
      }

      // ========================================================================
      // 4. SCREEN-SPACE OVERLAPPING PETAL CONTOUR & CHARACTER SHADING PASS
      // ========================================================================
      const palette = PALETTES[this.paletteKey] || PALETTES.crimson;
      const rampObj = GLYPH_RAMPS[this.rampKey] || GLYPH_RAMPS.botanical;
      const chars = rampObj.chars;
      const numChars = chars.length;
      const useContours = rampObj.useContours;
      const wireframeOnly = Boolean(rampObj.wireframeOnly);

      let activeCells = 0;

      for (let row = 0; row < rows; row++) {
        const rowOffset = row * cols;
        for (let col = 0; col < cols; col++) {
          const idx = rowOffset + col;
          const partCode = partBuf[idx];
          if (partCode === 0) continue;

          activeCells++;
          const z = zBuf[idx];
          const layer = layerBuf[idx];
          let lum = lumBuf[idx];
          let rim = rimBuf[idx];
          const spec = specBuf[idx];

          // Check 4-connected neighbors for depth jumps or overlapping petal layers
          let isSilhouetteEdge = false;
          let isPetalCrease = false;
          let isOccludedFold = false;
          let gradX = 0;
          let gradY = 0;

          if (col > 0 && col < cols - 1 && row > 0 && row < rows - 1) {
            const idxL = idx - 1;
            const idxR = idx + 1;
            const idxU = idx - cols;
            const idxD = idx + cols;

            const pL = partBuf[idxL];
            const pR = partBuf[idxR];
            const pU = partBuf[idxU];
            const pD = partBuf[idxD];

            if (pL === 0 || pR === 0 || pU === 0 || pD === 0) {
              isSilhouetteEdge = true;
              gradX = (pR === 0 ? 1 : 0) - (pL === 0 ? 1 : 0);
              gradY = (pD === 0 ? 1 : 0) - (pU === 0 ? 1 : 0);
            } else {
              const zL = zBuf[idxL];
              const zR = zBuf[idxR];
              const zU = zBuf[idxU];
              const zD = zBuf[idxD];

              // Genuine overlapping petal lip discontinuity
              const creaseThresh = 0.032;
              if (
                (layerBuf[idxL] !== layer && z < zL - creaseThresh) ||
                (layerBuf[idxR] !== layer && z < zR - creaseThresh) ||
                (layerBuf[idxU] !== layer && z < zU - creaseThresh) ||
                (layerBuf[idxD] !== layer && z < zD - creaseThresh)
              ) {
                isPetalCrease = true;
                gradX = (zR - zL);
                gradY = (zD - zU);
              } else if (
                (layerBuf[idxL] !== layer && z > zL + creaseThresh) ||
                (layerBuf[idxR] !== layer && z > zR + creaseThresh) ||
                (layerBuf[idxU] !== layer && z > zU + creaseThresh) ||
                (layerBuf[idxD] !== layer && z > zD + creaseThresh)
              ) {
                isOccludedFold = true;
              }
            }
          }

          if (isPetalCrease || isSilhouetteEdge) {
            rim = clamp(rim + 0.45, 0, 1);
            lum = clamp(lum + 0.25, 0, 1);
          } else if (isOccludedFold) {
            // Deep velvet shadow right underneath an overlapping petal!
            lum *= 0.60;
          }

          if (wireframeOnly && !isPetalCrease && !isSilhouetteEdge && spec < 0.5) {
            lum *= 0.28;
          }

          // Select ASCII character
          let ch;
          if (partCode === PART_CODES.pollen) {
            const pIdx = (layer - 200) % this.pollenParticles.length;
            ch = (this.pollenParticles[pIdx] && this.pollenParticles[pIdx].glyph) || '·';
          } else if (spec > 0.82) {
            ch = '✦';
          } else if (useContours && (isSilhouetteEdge || isPetalCrease)) {
            // Directional contour glyph aligned with screen-space tangent (+X right, +Y down)
            const gx = gradX || nxBuf[idx];
            const gy = gradY || -nyBuf[idx];
            const tx = -gy;
            const ty = gx;
            const angle = Math.atan2(ty, tx);
            const oct = Math.round((angle / Math.PI) * 4 + 4) % 4;
            if (oct === 0) ch = '_';
            else if (oct === 1) ch = '\\';
            else if (oct === 2) ch = '|';
            else ch = '/';
          } else {
            const charIdx = clamp(Math.floor(lum * (numChars - 1) + 0.5), 1, numChars - 1);
            ch = chars[charIdx];
          }

          this.charGrid[idx] = ch;
          const isFoliage = partCode >= PART_CODES.stem && partCode <= PART_CODES.sepal;
          if (isFoliage) {
            this.shadeRow[idx] = 12 + clamp(Math.floor(lum * 3.99), 0, 3);
          } else if (partCode === PART_CODES.stamen || spec > 0.78) {
            this.shadeRow[idx] = 11;
          } else {
            this.shadeRow[idx] = clamp(Math.floor(lum * 10.99), 0, 10);
          }

          // Compute palette-transformed RGB
          const partName = CODE_TO_PART[partCode] || 'petal';
          const rgb = palette.transformColor(
            rBuf[idx],
            gBuf[idx],
            bBuf[idx],
            partName,
            lum,
            rim,
            spec
          );
          this.colorR[idx] = rgb[0];
          this.colorG[idx] = rgb[1];
          this.colorB[idx] = rgb[2];
        }
      }

      return {
        activeCells,
        vertexCount: nPts,
        fallingPetalCount: this.fallingPetals.length,
        bloom: this.bloom
      };
    }

    /**
     * Converts the current rendered frame to a pure multiline ASCII string.
     */
    toAsciiString(trimEmptyLines) {
      const lines = [];
      const rowHasPlant = [];
      for (let r = 0; r < this.rows; r++) {
        const offset = r * this.cols;
        let line = '';
        let hasPlant = false;
        for (let c = 0; c < this.cols; c++) {
          const idx = offset + c;
          line += this.charGrid[idx] || ' ';
          const p = this.partBuf[idx];
          if (p > 0 && p !== PART_CODES.pollen) {
            hasPlant = true;
          }
        }
        lines.push(line.replace(/\s+$/, ''));
        rowHasPlant.push(hasPlant);
      }
      if (trimEmptyLines) {
        while (lines.length > 0 && (!rowHasPlant[0] && lines[0].trim().length <= 3)) {
          lines.shift();
          rowHasPlant.shift();
        }
        while (lines.length > 0 && (!rowHasPlant[lines.length - 1] && lines[lines.length - 1].trim().length <= 3)) {
          lines.pop();
          rowHasPlant.pop();
        }
        // Strip excessive common left-side blank margin so the rose is cleanly framed
        let minLead = Infinity;
        for (let i = 0; i < lines.length; i++) {
          const ln = lines[i];
          if (ln.trim().length === 0) continue;
          const m = ln.match(/^ +/);
          const lead = m ? m[0].length : 0;
          if (lead < minLead) minLead = lead;
        }
        if (Number.isFinite(minLead) && minLead > 2) {
          const strip = minLead - 2;
          for (let i = 0; i < lines.length; i++) {
            lines[i] = lines[i].length > strip ? lines[i].slice(strip) : '';
          }
        }
      }
      return lines.join('\n');
    }

    /**
     * Draws the current rendered ASCII buffer onto a High-DPI HTML5 Canvas2D context
     * with phosphor bloom, vignette, and optional CRT scanlines.
     */
    drawToCanvas(ctx, canvasWidth, canvasHeight) {
      const palette = PALETTES[this.paletteKey] || PALETTES.crimson;
      const cols = this.cols;
      const rows = this.rows;

      // 1. Cached Background & Radial Glow (eliminates per-frame gradient allocation)
      const bgKey = `${canvasWidth}|${canvasHeight}|${this.paletteKey}|${Math.round(this.glowIntensity * 10)}`;
      if (typeof document !== 'undefined') {
        if (!this._bgCanvas) {
          this._bgCanvas = document.createElement('canvas');
        }
        if (this._bgCacheKey !== bgKey) {
          this._bgCacheKey = bgKey;
          this._bgCanvas.width = canvasWidth;
          this._bgCanvas.height = canvasHeight;
          const bctx = this._bgCanvas.getContext('2d');
          bctx.fillStyle = palette.bg;
          bctx.fillRect(0, 0, canvasWidth, canvasHeight);
          const cx = canvasWidth * 0.5;
          const cy = canvasHeight * 0.45;
          const gradRadius = Math.max(canvasWidth, canvasHeight) * 0.54;
          const bgGrad = bctx.createRadialGradient(cx, cy, gradRadius * 0.03, cx, cy, gradRadius);
          bgGrad.addColorStop(0, palette.glowColor.replace(/[\d.]+\)$/, `${0.18 * this.glowIntensity})`));
          bgGrad.addColorStop(0.5, palette.glowColor.replace(/[\d.]+\)$/, `${0.05 * this.glowIntensity})`));
          bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          bctx.fillStyle = bgGrad;
          bctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        ctx.drawImage(this._bgCanvas, 0, 0);
      } else {
        ctx.fillStyle = palette.bg;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        const cx = canvasWidth * 0.5;
        const cy = canvasHeight * 0.45;
        const gradRadius = Math.max(canvasWidth, canvasHeight) * 0.54;
        const bgGrad = ctx.createRadialGradient(cx, cy, gradRadius * 0.03, cx, cy, gradRadius);
        bgGrad.addColorStop(0, palette.glowColor.replace(/[\d.]+\)$/, `${0.18 * this.glowIntensity})`));
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      // 2. Calculate optimal cell dimensions & font size
      const cellW = canvasWidth / cols;
      const cellH = canvasHeight / rows;
      const fontSize = Math.max(8, Math.floor(Math.min(cellH * 0.98, cellW * 1.80)));

      const charGrid = this.charGrid;
      const shadeRow = this.shadeRow;

      // 3. GPU-blitted Offscreen Glyph Atlas (zero fillText calls per frame!)
      if (typeof document !== 'undefined' && typeof ctx.drawImage === 'function') {
        const cellWInt = Math.max(4, Math.ceil(cellW));
        const cellHInt = Math.max(6, Math.ceil(cellH));
        const atlasKey = `${cellWInt}|${cellHInt}|${this.paletteKey}|${this.rampKey}`;

        if (!this._glyphAtlas || this._atlasKey !== atlasKey) {
          this._atlasKey = atlasKey;
          const rampObj = GLYPH_RAMPS[this.rampKey] || GLYPH_RAMPS.botanical;
          const rawChars = rampObj.chars + '✦_\\|/·°✧∙*';
          const unique = [];
          const charMap = Object.create(null);
          for (let i = 0; i < rawChars.length; i++) {
            const ch = rawChars[i];
            if (ch !== ' ' && charMap[ch] === undefined) {
              charMap[ch] = unique.length;
              unique.push(ch);
            }
          }
          this._atlasMap = charMap;

          if (!this._glyphAtlas) {
            this._glyphAtlas = document.createElement('canvas');
          }
          this._glyphAtlas.width = unique.length * cellWInt;
          this._glyphAtlas.height = 16 * cellHInt;
          const actx = this._glyphAtlas.getContext('2d');
          actx.clearRect(0, 0, this._glyphAtlas.width, this._glyphAtlas.height);
          actx.font = `600 ${fontSize}px "JetBrains Mono", "Space Mono", "Fira Code", "Consolas", monospace`;
          actx.textBaseline = 'middle';
          actx.textAlign = 'center';

          for (let rowIdx = 0; rowIdx < 16; rowIdx++) {
            let rgb;
            if (rowIdx < 11) {
              const lum = 0.16 + (rowIdx / 10) * 0.84;
              rgb = palette.transformColor(0.88, 0.08, 0.14, 'petal', lum, rowIdx / 14, rowIdx >= 9 ? 0.25 : 0);
            } else if (rowIdx === 11) {
              rgb = palette.transformColor(0.98, 0.80, 0.22, 'stamen', 1.0, 0.85, 0.9);
            } else {
              const lum = 0.25 + ((rowIdx - 12) / 3) * 0.72;
              rgb = palette.transformColor(0.14, 0.65, 0.18, 'leaf', lum, 0.25, 0);
            }
            actx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
            const py = (rowIdx + 0.5) * cellHInt;
            for (let g = 0; g < unique.length; g++) {
              actx.fillText(unique[g], (g + 0.5) * cellWInt, py);
            }
          }
        }

        const atlas = this._glyphAtlas;
        const charMap = this._atlasMap;
        for (let r = 0; r < rows; r++) {
          const rowOff = r * cols;
          const dy = r * cellH;
          for (let c = 0; c < cols; c++) {
            const idx = rowOff + c;
            const ch = charGrid[idx];
            if (ch === ' ') continue;
            const gIdx = charMap[ch];
            if (gIdx === undefined) continue;
            ctx.drawImage(
              atlas,
              gIdx * cellWInt,
              shadeRow[idx] * cellHInt,
              cellWInt,
              cellHInt,
              c * cellW,
              dy,
              cellW,
              cellH
            );
          }
        }
      } else {
        // Headless fallback for Node.js verification
        ctx.font = `600 ${fontSize}px "JetBrains Mono", "Space Mono", "Fira Code", "Consolas", monospace`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        const colorR = this.colorR;
        const colorG = this.colorG;
        const colorB = this.colorB;
        let lastFgRgb = -1;
        for (let r = 0; r < rows; r++) {
          const rowOff = r * cols;
          const py = (r + 0.5) * cellH;
          for (let c = 0; c < cols; c++) {
            const idx = rowOff + c;
            const ch = charGrid[idx];
            if (ch === ' ') continue;
            const px = (c + 0.5) * cellW;
            const cr = colorR[idx] & 0xF8;
            const cg = colorG[idx] & 0xF8;
            const cb = colorB[idx] & 0xF8;
            const packed = (cr << 16) | (cg << 8) | cb;
            if (packed !== lastFgRgb) {
              lastFgRgb = packed;
              ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
            }
            ctx.fillText(ch, px, py);
          }
        }
      }
    }
  }

  return {
    PALETTES,
    GLYPH_RAMPS,
    PART_CODES,
    AsciiRoseEngine
  };
});
