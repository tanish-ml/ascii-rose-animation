/**
 * ROSA MATHEMATICA — 3D Parametric Rose Geometry & Morphogenesis Engine
 * Supports 3 distinct mathematical rose models with real-time bloom articulation,
 * true 3D Euclidean anatomical assembly (petals, stamens, calyx sepals, receptacle,
 * thorny stem, and serrated leaves), surface normal estimation, and falling petal physics.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AsciiRoseMath = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PI = Math.PI;
  const TAU = Math.PI * 2;

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function posMod(a, n) {
    return ((a % n) + n) % n;
  }

  function normalize3(x, y, z) {
    const len = Math.hypot(x, y, z);
    if (len < 1e-8) return [0, 1, 0];
    return [x / len, y / len, z / len];
  }

  function cross3(ax, ay, az, bx, by, bz) {
    return [
      ay * bz - az * by,
      az * bx - ax * bz,
      ax * by - ay * bx
    ];
  }

  /**
   * Spine curve of the rose stem from top receptacle (t=0) to base (t=1)
   */
  function getStemSpine(t, windSwayX, windSwayZ) {
    const swayX = (windSwayX || 0) * Math.pow(1 - t, 1.8);
    const swayZ = (windSwayZ || 0) * Math.pow(1 - t, 1.8);
    return {
      x: -Math.sin(t * 2.2) * 0.11 + Math.sin(t * 5.0) * 0.02 + swayX,
      y: 0.04 - t * 1.50,
      z: Math.cos(t * 1.8 - 0.5) * 0.06 - 0.04 + swayZ
    };
  }

  // ============================================================================
  // SHARED 3D BOTANICAL ANATOMY: RECEPTACLE, SEPALS, THORNY STEM & SERRATED LEAVES
  // ============================================================================
  function evalStemAndReceptacle(a, b, thornDetail) {
    const theta = a * TAU;
    const spine = getStemSpine(b, 0, 0);

    // Top 12% of b (b in [0, 0.12]) swells into the bulbous rose hip / receptacle cup
    let radius;
    let isReceptacle = false;
    if (b < 0.11) {
      isReceptacle = true;
      const cupT = b / 0.11; // 0 at top rim, 1 at stem neck
      radius = 0.045 + Math.sin((1 - cupT) * PI * 0.78) * 0.115;
    } else {
      // Cylindrical stem tapering slightly with subtle organic fluting
      radius = (0.046 + 0.014 * Math.pow(b, 1.2)) * (1 + 0.06 * Math.sin(theta * 5 + b * 12));
    }

    // Sharp rose thorns along 3 helical phyllotaxis ridges
    let thornSpike = 0;
    if (!isReceptacle && thornDetail > 0.02 && b > 0.16 && b < 0.92) {
      const thornHelix = Math.cos(theta - b * 18.0);
      const thornBand = Math.sin(b * 34.0);
      if (thornHelix > 0.82 && thornBand > 0.72) {
        const uThorn = (thornHelix - 0.82) / 0.18;
        const vThorn = (thornBand - 0.72) / 0.28;
        const profile = Math.sin(uThorn * PI * 0.5) * Math.sin(vThorn * PI);
        thornSpike = thornDetail * 0.11 * Math.pow(profile, 2.2);
      }
    }

    const rTotal = radius + thornSpike;
    const hookDown = thornSpike * 0.45; // Thorns hook slightly downward

    const wx = spine.x + Math.cos(theta) * rTotal;
    const wy = spine.y - hookDown;
    const wz = spine.z + Math.sin(theta) * rTotal;

    const isThorn = thornSpike > 0.025;
    return {
      x: wx,
      y: wy,
      z: wz,
      u: a,
      v: b,
      part: isThorn ? 'thorn' : 'stem',
      layer: 0,
      r: isThorn ? 0.58 : clamp(0.10 + a * 0.15 + (isReceptacle ? 0.06 : 0), 0.06, 0.35),
      g: isThorn ? 0.42 : clamp(0.42 + (1 - b) * 0.28 + Math.sin(theta) * 0.08, 0.20, 0.78),
      b: isThorn ? 0.22 : 0.14
    };
  }

  function evalSepalPoint(a, b, sepalIdx, bloom) {
    // 5 Calyx Sepals arranged around the receptacle
    const baseAngle = (sepalIdx * TAU) / 5 + 0.35;
    const A = a * 2 - 1; // [-1, 1] across width
    // Pointed lanceolate sepal silhouette
    const widthEnv = Math.sin(Math.pow(1 - b, 0.65) * PI) * (1 - Math.pow(b, 1.5) * 0.65);
    const localW = A * widthEnv * 0.19;

    // When in tight bud (bloom -> 0), sepals clasp upward around the bud;
    // when bloomed (bloom -> 1), sepals reflex outward and slightly downward
    const openT = clamp(bloom, 0.05, 1.2);
    const reflexAngle = lerp(0.35, 1.72, smoothstep(0.0, 0.75, openT));

    const len = b * 0.52;
    const arch = Math.sin(b * PI) * 0.06;
    const radial = 0.11 + len * Math.sin(reflexAngle) + arch * Math.cos(reflexAngle);
    const height = 0.03 + len * Math.cos(reflexAngle) - arch * Math.sin(reflexAngle);

    const cosA = Math.cos(baseAngle);
    const sinA = Math.sin(baseAngle);

    const wx = radial * cosA - localW * sinA;
    const wz = radial * sinA + localW * cosA;
    const wy = height + (1 - A * A) * 0.02;

    return {
      x: wx,
      y: wy,
      z: wz,
      u: a,
      v: b,
      part: 'sepal',
      layer: sepalIdx,
      r: clamp(0.14 + b * 0.22, 0.10, 0.42),
      g: clamp(0.45 + (1 - b * 0.4) * 0.35, 0.25, 0.82),
      b: 0.14
    };
  }

  function evalSerratedLeafPoint(a, b, leafIdx) {
    // 2 compound-inspired serrated rose leaves sprouting cleanly from the stem
    const isRight = leafIdx === 1;
    const stemT = isRight ? 0.38 : 0.62;
    const anchor = getStemSpine(stemT, 0, 0);

    // U in [-1, 1] across leaf blade, b in [0, 1] from petiole base to acuminate tip
    const U = a * 2 - 1;
    const absU = Math.abs(U);

    // Classic rose leaflet ovate-acuminate envelope + Román Cortés's serrated margin teeth
    const baseEnvelope = Math.sin(Math.pow(b, 0.72) * PI);
    const serration = b > 0.12 && b < 0.95 ? Math.cos(b * 95) * 0.025 * absU : 0;
    const halfWidth = (baseEnvelope * 0.29 + serration) * (1 - 0.12 * b);

    const bladeX = U * halfWidth;
    const bladeLen = (0.05 + b * 0.80);

    // V-shaped midrib fold + natural graceful downward arch at leaf tip
    const midribFold = absU * 0.055 * Math.sin(b * PI);
    const bladeArch = Math.sin(b * PI * 0.82) * 0.12 - Math.pow(b, 2.2) * 0.18 + midribFold;

    // Orient leaves outward to left (-X) and right (+X)
    const yaw = isRight ? 0.18 : PI - 0.22;
    const pitch = isRight ? 0.26 : 0.22;

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const localR = bladeLen * cosP - bladeArch * sinP;
    const localY = bladeLen * sinP + bladeArch * cosP;

    const wx = anchor.x + localR * cosY - bladeX * sinY;
    const wy = anchor.y + localY;
    const wz = anchor.z + localR * sinY + bladeX * cosY;

    // Pinnate lateral veins branching from midrib at 45 degrees
    const veinCoord = (b * 14 - absU * 6.5) * PI;
    const lateralVein = Math.pow(Math.max(0, Math.cos(veinCoord)), 14) * (1 - absU * 0.5);
    const midribHighlight = Math.exp(-absU * 28) * 0.28;
    const veinBoost = lateralVein * 0.2 + midribHighlight;

    const r = clamp(0.11 + veinBoost * 0.7 + b * 0.12, 0.06, 0.58);
    const g = clamp(0.42 + (1 - absU * 0.3) * 0.38 + veinBoost * 0.9, 0.25, 0.96);
    const bl = clamp(0.12 + veinBoost * 0.25, 0.08, 0.38);

    return {
      x: wx,
      y: wy,
      z: wz,
      u: a,
      v: 0.35 + 0.65 * (1 - absU * 0.5),
      part: 'leaf',
      layer: 50 + leafIdx,
      r: r,
      g: g,
      b: bl
    };
  }

  // ============================================================================
  // MODEL 1: ROMÁN CORTÉS 24-PETAL ROSE (Normalized & Bloom-Articulated in 3D)
  // ============================================================================
  function evalCortesPetal(a, b, petalIdx, bloom) {
    const A = a * 2 - 1;

    // In Cortés's equation, petalIdx = 0 (c = 0) is the OUTERMOST petal (widest & furthest out),
    // and petalIdx = 23 (c = 31.08) is the INNERMOST tight spiral bud core!
    const petalRatio = 1.0 - (petalIdx / 23); // 1 = outermost petal, 0 = innermost core

    // Progressive bloom: outer petals (petalRatio ~ 1) unfurl first, inner petals stay cupped longer
    const localBloom = smoothstep(0.0, 0.95, bloom * (0.38 + 0.72 * petalRatio));

    // In Cortés's equation, b=0 (B=-1) is the upper curled lip of the petal, b=1 (B=+1) is the base
    const vTip = 1 - b; // 0 at base, 1 at upper lip
    const absA = Math.abs(A);

    // Polar flare angle phi: inner bud core stands upright (phi ~ 0.15), outer petals open wide (phi ~ 1.25)
    const flarePhi = lerp(
      0.12 + 0.22 * petalRatio,
      0.16 + 1.12 * Math.pow(petalRatio, 0.92) + Math.max(0, bloom - 1) * 0.24 * petalRatio,
      localBloom
    );
    const sinPhi = Math.sin(flarePhi);
    const cosPhi = Math.cos(flarePhi);

    // Cortés's signature 7th-power rolled upper petal lip + concave bowl curvature
    const cortLipRoll = (1 - Math.cos(Math.pow(vTip, 7))) * 0.22 * localBloom;
    const cupDepth = Math.sin(vTip * PI * 0.85) * 0.11 * (1 - 0.65 * A * A);

    const petalLen = vTip * (0.52 + 0.34 * petalRatio);
    const baseRadius = 0.04 + 0.34 * Math.pow(petalRatio, 0.88) * localBloom;

    // True 3D polar projection: inner whorls form a nested spiral cup; outer whorls flare wide
    const rDist = Math.max(
      0.03,
      baseRadius + petalLen * sinPhi + cupDepth * 0.45 + cortLipRoll * Math.cos(A * PI * 1.15)
    );
    const wy = 0.04 + petalLen * cosPhi + (1 - petalRatio) * 0.14 * vTip - cortLipRoll * 0.38 - petalRatio * 0.18 * localBloom * vTip;

    //Since (A, B) is constrained to the unit disk A² + B² < 0.98, A naturally tapers at the tip & base
    const halfAngle = (0.72 + 0.36 * petalRatio) * lerp(0.78, 1.06, localBloom);
    const angularOffset = A * halfAngle;
    const baseAzimuth = petalIdx * 2.39996323; // 137.50776 deg Golden Angle
    const theta = baseAzimuth + angularOffset;

    const wx = rDist * Math.cos(theta);
    const wz = rDist * Math.sin(theta);

    // Rich radial + vertical velvet shading with bright curled upper lips
    const radialRim = Math.sqrt(Math.min(1, A * A + (2 * b - 1) * (2 * b - 1)));
    const vShade = clamp(vTip * 0.78 + radialRim * 0.22 * vTip, 0, 1);
    const red = clamp((0.32 + 0.68 * Math.pow(vShade, 0.65)) + 0.12 * (1 - absA), 0.22, 1.0);
    const green = clamp(Math.pow(vShade, 5.5) * 0.38 + 0.04, 0.02, 0.52);
    const blue = clamp(red * red * 0.32, 0.03, 0.48);

    return {
      x: wx,
      y: wy,
      z: wz,
      u: a,
      v: vShade,
      part: 'petal',
      layer: petalIdx,
      petalRatio: petalRatio,
      r: red,
      g: green,
      b: blue
    };
  }

  // ============================================================================
  // MODEL 2: PAUL NYLANDER CONTINUOUS LOGARITHMIC SPIRAL ROSE
  // ============================================================================
  function evalNylanderRosePoint(xParam, thetaNorm, bloom) {
    // theta ranges from -2*PI (outermost petals) to 15*PI (innermost tight spiral core)
    const openFactor = smoothstep(0.0, 0.95, clamp(bloom, 0.02, 1.2));
    const theta = -2 * PI + thetaNorm * (17 * PI);

    // At theta = -2*PI (outer petals), phi reaches phiMax; at theta = 15*PI (core), phi stays tightly vertical
    const phiMax = lerp(0.28, PI * 0.48, openFactor);
    const expDivisor = lerp(14.0 * PI, 7.8 * PI, openFactor);
    const phi = clamp(phiMax * Math.exp(-theta / expDivisor), 0.08, PI * 0.54);

    const modVal = posMod(3.6 * theta, TAU);
    const lobeNorm = 1 - Math.abs(1 - modVal / PI); // 0 at petal notch, 1 at petal crest
    const inner = 1.25 * Math.pow(1 - modVal / PI, 2) - 0.25;
    const X = 1 - 0.5 * inner * inner;

    const x2 = xParam * xParam;
    const term = 1.27689 * xParam - 1;
    const y = 1.95653 * x2 * (term * term) * Math.sin(phi);

    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    const rScale = lerp(0.52, 1.06 + Math.max(0, bloom - 1) * 0.18, openFactor);
    const baseRadius = 0.05 * (1 - thetaNorm) * (1 - xParam);
    const rProj = baseRadius + X * (xParam * sinPhi + y * cosPhi) * rScale;
    const zUp = X * (xParam * cosPhi - y * sinPhi);

    // Anchor petal base (xParam = 0) directly into the receptacle cup (y ~ 0.04) across all bloom stages
    const cupLift = Math.sin(xParam * PI * 0.75) * 0.16 * openFactor + xParam * (1 - thetaNorm) * 0.12;
    const wx = rProj * Math.sin(theta);
    const wz = rProj * Math.cos(theta);
    const wy = 0.04 + (zUp * 0.88) + cupLift;

    const vEffective = clamp(xParam * (0.72 + 0.28 * lobeNorm), 0, 1);
    const red = clamp(0.32 + 0.68 * Math.pow(vEffective, 0.72), 0.22, 1.0);
    const green = clamp(0.04 + 0.34 * Math.pow(vEffective, 6), 0.02, 0.48);
    const blue = clamp(0.06 + 0.30 * Math.pow(vEffective, 2.8), 0.03, 0.45);

    // Continuous petal index (3.6 petals per 2*PI revolution)
    const petalId = Math.floor((3.6 * (theta + 2 * PI)) / TAU);

    return {
      x: wx,
      y: wy,
      z: wz,
      u: lobeNorm,
      v: vEffective,
      part: 'petal',
      layer: petalId,
      petalRatio: 1 - thetaNorm,
      r: red,
      g: green,
      b: blue
    };
  }

  // ============================================================================
  // MODEL 3: SACRED TUDOR / FIBONACCI PHYLLOTAXIS ROSE
  // ============================================================================
  function evalFibonacciPetalPoint(u, v, petalIdx, totalPetals, bloom) {
    const goldenAngle = 2.399963229728653; // PI * (3 - sqrt(5))
    const pRatio = petalIdx / (totalPetals - 1);
    const baseAzimuth = petalIdx * goldenAngle;

    const U = u * 2 - 1;
    const absU = Math.abs(U);
    const localOpen = smoothstep(0.0, 0.92, bloom * (0.35 + 0.75 * pRatio));

    const baseRadius = 0.04 + 0.36 * Math.pow(pRatio, 0.88) * localOpen;
    const flareAngle = lerp(0.14, 0.18 + 1.08 * Math.pow(pRatio, 0.9), localOpen);

    const lipCurl = Math.pow(Math.max(0, v - 0.55) / 0.45, 2.0) * 0.20 * localOpen * Math.cos(U * PI * 1.4);
    const cupCurve = Math.sin(v * PI * 0.85) * 0.10 * (1 - U * U * 0.6);
    const cornerRound = 1.0 - 0.22 * Math.pow(absU, 2.2) * Math.pow(v, 1.5);

    const rDist = Math.max(
      0.03,
      baseRadius + v * (0.46 + 0.36 * pRatio) * cornerRound * Math.sin(flareAngle) + lipCurl + cupCurve * 0.45
    );
    const height = 0.04 + v * (0.54 + 0.20 * (1 - pRatio)) * cornerRound * Math.cos(flareAngle) + (1 - pRatio) * 0.12 * v - pRatio * 0.16 * localOpen * v;

    const bladeEnv = 0.45 + 0.55 * Math.sin(Math.pow(v, 0.58) * PI * 0.88);
    const angularSpan = U * bladeEnv * (0.68 + 0.32 * pRatio) * lerp(0.78, 1.05, localOpen);
    const theta = baseAzimuth + angularSpan;

    const wx = rDist * Math.cos(theta);
    const wz = rDist * Math.sin(theta);
    const wy = height;

    const isStamen = petalIdx < 5 && v < 0.45;
    const vShade = clamp(v * (1 - 0.20 * U * U), 0, 1);
    const red = isStamen ? 0.98 : clamp(0.32 + 0.68 * Math.pow(vShade, 0.68), 0.22, 1.0);
    const green = isStamen ? 0.78 : clamp(0.04 + 0.34 * Math.pow(vShade, 5.5), 0.02, 0.48);
    const blue = isStamen ? 0.18 : clamp(0.06 + 0.28 * vShade * vShade, 0.03, 0.44);

    return {
      x: wx,
      y: wy,
      z: wz,
      u: u,
      v: vShade,
      part: isStamen ? 'stamen' : 'petal',
      layer: petalIdx,
      petalRatio: pRatio,
      r: red,
      g: green,
      b: blue
    };
  }

  // ============================================================================
  // MODEL 4: SACRED LOTUS (Nelumbo nucifera — Concentric Boat-Shaped Petals)
  // ============================================================================
  function evalLotusPetalPoint(u, v, petalIdx, totalPetals, bloom) {
    const goldenAngle = 2.399963229728653;
    const pRatio = petalIdx / (totalPetals - 1);
    const baseAzimuth = petalIdx * goldenAngle;

    const U = u * 2 - 1;
    // Boat-shaped acuminate lotus petal
    const widthEnv = Math.sin(Math.pow(v, 0.55) * PI) * (0.44 + 0.42 * pRatio);
    const localOpen = smoothstep(0.0, 0.95, bloom * (0.30 + 0.80 * pRatio));

    const baseRadius = 0.08 + 0.26 * pRatio * localOpen;
    const flareAngle = lerp(0.18, 0.35 + 1.12 * pRatio, localOpen);
    const cupCurve = Math.sin(v * PI) * 0.20 * (1 - U * U * 0.75);

    const rDist = baseRadius + v * (0.48 + 0.34 * pRatio) * Math.sin(flareAngle) - cupCurve * Math.cos(flareAngle);
    const height = 0.04 + v * (0.52 + 0.24 * (1 - pRatio)) * Math.cos(flareAngle) + cupCurve * Math.sin(flareAngle);

    const angularSpan = (U * widthEnv) / Math.max(0.25, rDist * 0.88);
    const theta = baseAzimuth + angularSpan;

    const isSeedPod = petalIdx < 4 && v < 0.38;
    const vShade = clamp(v * (1 - 0.20 * U * U), 0, 1);

    return {
      x: rDist * Math.cos(theta),
      y: height,
      z: rDist * Math.sin(theta),
      u: u,
      v: vShade,
      part: isSeedPod ? 'stamen' : 'petal',
      layer: petalIdx,
      petalRatio: pRatio,
      r: isSeedPod ? 0.96 : clamp(0.45 + 0.52 * Math.pow(vShade, 0.7), 0.25, 1.0),
      g: isSeedPod ? 0.82 : clamp(0.18 + 0.55 * Math.pow(vShade, 2.2), 0.10, 0.85),
      b: isSeedPod ? 0.22 : clamp(0.38 + 0.50 * Math.pow(vShade, 1.4), 0.20, 0.95)
    };
  }

  // ============================================================================
  // MODEL 5: CELESTIAL DAHLIA (48 Quilled Golden-Angle Petals)
  // ============================================================================
  function evalDahliaPetalPoint(u, v, petalIdx, totalPetals, bloom) {
    const goldenAngle = 2.399963229728653;
    const pRatio = petalIdx / (totalPetals - 1);
    const baseAzimuth = petalIdx * goldenAngle;

    const U = u * 2 - 1;
    // Narrower quilled tubular-tipped petals
    const widthEnv = Math.sin(Math.pow(v, 0.65) * PI * 0.92) * (0.24 + 0.28 * pRatio);
    const localOpen = smoothstep(0.0, 0.92, bloom * (0.32 + 0.78 * pRatio));

    const baseRadius = 0.03 + 0.34 * pRatio * localOpen;
    const flareAngle = lerp(0.15, 0.22 + 1.25 * pRatio, localOpen);
    const quillCurl = (U * U) * 0.08 * Math.sin(v * PI);

    const rDist = baseRadius + v * (0.36 + 0.42 * pRatio) * Math.sin(flareAngle);
    const height = 0.06 + v * (0.48 + 0.18 * (1 - pRatio)) * Math.cos(flareAngle) + quillCurl - pRatio * 0.16 * localOpen;

    const angularSpan = (U * widthEnv) / Math.max(0.22, rDist * 0.9);
    const theta = baseAzimuth + angularSpan;

    const isCore = petalIdx < 7 && v < 0.42;
    const vShade = clamp(v * (1 - 0.15 * U * U), 0, 1);

    return {
      x: rDist * Math.cos(theta),
      y: height,
      z: rDist * Math.sin(theta),
      u: u,
      v: vShade,
      part: isCore ? 'stamen' : 'petal',
      layer: petalIdx,
      petalRatio: pRatio,
      r: isCore ? 0.99 : clamp(0.32 + 0.66 * Math.pow(vShade, 0.8), 0.18, 1.0),
      g: isCore ? 0.76 : clamp(0.06 + 0.42 * Math.pow(vShade, 3.5), 0.03, 0.65),
      b: isCore ? 0.16 : clamp(0.14 + 0.48 * Math.pow(vShade, 2.0), 0.06, 0.72)
    };
  }

  function evalThornPoint(u, v, thornIdx, thornDetail) {
    // 6 hooked botanical thorns arranged in phyllotaxis along the stem
    const stemT = 0.18 + thornIdx * 0.13;
    const spine = getStemSpine(stemT, 0, 0);
    const stemRadius = 0.046 + 0.014 * Math.pow(stemT, 1.2);
    const azimuth = thornIdx * 2.39996 + 0.6; // Golden angle spiral around stem

    // u in [0, 1] around thorn cone, v in [0, 1] from base on stem to sharp hooked tip
    const coneAngle = u * TAU;
    const baseR = 0.036 * (1 - Math.pow(v, 0.75));
    const thornLen = v * (0.09 + 0.08 * thornDetail);
    const hookCurve = Math.pow(v, 2.1) * 0.055; // Hook downward like a real Rosa canina prickle

    const localRadial = stemRadius * 0.88 + thornLen;
    const localY = spine.y - hookCurve + Math.cos(coneAngle) * baseR;
    const localTangent = Math.sin(coneAngle) * baseR;

    const cosA = Math.cos(azimuth);
    const sinA = Math.sin(azimuth);

    return {
      x: spine.x + localRadial * cosA - localTangent * sinA,
      y: localY,
      z: spine.z + localRadial * sinA + localTangent * cosA,
      u: u,
      v: v,
      part: 'thorn',
      layer: thornIdx,
      r: clamp(0.45 + v * 0.35, 0.35, 0.85),
      g: clamp(0.32 + (1 - v) * 0.25, 0.20, 0.65),
      b: clamp(0.18 + v * 0.12, 0.12, 0.35)
    };
  }

  // ============================================================================
  // COMPLETE POINT-CLOUD & SURFACE NORMAL GENERATOR
  // ============================================================================
  function appendPointWithNormal(points, evalFn, u, v, thornDetail) {
    const eps = 0.008;
    const duStep = (u + eps <= 1.0) ? eps : -eps;
    const dvStep = (v + eps <= 1.0) ? eps : -eps;

    const p0 = evalFn(u, v);
    const pu = evalFn(u + duStep, v);
    const pv = evalFn(u, v + dvStep);

    const dux = (pu.x - p0.x) / duStep;
    const duy = (pu.y - p0.y) / duStep;
    const duz = (pu.z - p0.z) / duStep;

    const dvx = (pv.x - p0.x) / dvStep;
    const dvy = (pv.y - p0.y) / dvStep;
    const dvz = (pv.z - p0.z) / dvStep;

    const c = cross3(dux, duy, duz, dvx, dvy, dvz);
    const n = normalize3(c[0], c[1], c[2]);

    p0.nx = n[0];
    p0.ny = n[1];
    p0.nz = n[2];

    // Deterministic dewdrop placement on upper petal surfaces
    if (thornDetail > 0.2 && p0.part === 'petal') {
      const hash = Math.sin(u * 127.1 + v * 311.7 + (p0.layer || 0) * 74.7) * 43758.5453;
      const frac = hash - Math.floor(hash);
      if (frac > 1.0 - thornDetail * 0.014 && p0.v > 0.25 && p0.v < 0.88) {
        p0.isDewdrop = true;
      }
    }

    points.push(p0);
  }

  /**
   * Generates the bloom-dependent flower head & calyx sepals point cloud.
   */
  function generateFlowerHeadCloud(options) {
    const opts = options || {};
    const model = opts.model || 'cortes';
    const bloom = typeof opts.bloom === 'number' ? clamp(opts.bloom, 0.02, 1.25) : 1.0;
    const density = typeof opts.density === 'number' ? clamp(opts.density, 0.4, 2.2) : 1.0;
    const thornDetail = typeof opts.thornDetail === 'number' ? clamp(opts.thornDetail, 0, 1) : 0.7;

    const points = [];

    // 1. Sample Flower Head according to selected Mathematical Model
    if (model === 'cortes') {
      const baseGridN = Math.max(16, Math.round(26 * Math.sqrt(density)));
      for (let petalIdx = 0; petalIdx < 24; petalIdx++) {
        // Outer petals have larger surface area, so sample them more densely than tiny core petals
        const petalScale = petalIdx < 10 ? 1.18 : (petalIdx < 18 ? 1.0 : 0.82);
        const gridN = Math.max(12, Math.round(baseGridN * petalScale));
        for (let ia = 0; ia < gridN; ia++) {
          const a = (ia + 0.5) / gridN;
          const A = a * 2 - 1;
          for (let ib = 0; ib < gridN; ib++) {
            const b = (ib + 0.5) / gridN;
            const B = b * 2 - 1;
            if (A * A + B * B < 0.98) {
              appendPointWithNormal(points, (uu, vv) => evalCortesPetal(uu, vv, petalIdx, bloom), a, b, thornDetail);
            }
          }
        }
      }
    } else if (model === 'nylander') {
      const nxSteps = Math.max(18, Math.round(28 * Math.sqrt(density)));
      const nThetaSteps = Math.max(240, Math.round(400 * Math.sqrt(density)));
      for (let ix = 0; ix < nxSteps; ix++) {
        const xParam = (ix + 0.5) / nxSteps;
        for (let it = 0; it < nThetaSteps; it++) {
          const tNorm = (it + 0.5) / nThetaSteps;
          appendPointWithNormal(points, (uu, vv) => evalNylanderRosePoint(uu, vv, bloom), xParam, tNorm, thornDetail);
        }
      }
    } else if (model === 'fibonacci') {
      const totalPetals = 36;
      const pU = Math.max(13, Math.round(20 * Math.sqrt(density)));
      const pV = Math.max(13, Math.round(20 * Math.sqrt(density)));
      for (let p = 0; p < totalPetals; p++) {
        for (let iu = 0; iu < pU; iu++) {
          const u = (iu + 0.5) / pU;
          for (let iv = 0; iv < pV; iv++) {
            const v = (iv + 0.5) / pV;
            appendPointWithNormal(points, (uu, vv) => evalFibonacciPetalPoint(uu, vv, p, totalPetals, bloom), u, v, thornDetail);
          }
        }
      }
    } else if (model === 'lotus') {
      const totalPetals = 24;
      const pU = Math.max(14, Math.round(22 * Math.sqrt(density)));
      const pV = Math.max(14, Math.round(22 * Math.sqrt(density)));
      for (let p = 0; p < totalPetals; p++) {
        for (let iu = 0; iu < pU; iu++) {
          const u = (iu + 0.5) / pU;
          for (let iv = 0; iv < pV; iv++) {
            const v = (iv + 0.5) / pV;
            appendPointWithNormal(points, (uu, vv) => evalLotusPetalPoint(uu, vv, p, totalPetals, bloom), u, v, thornDetail);
          }
        }
      }
    } else if (model === 'dahlia') {
      const totalPetals = 48;
      const pU = Math.max(10, Math.round(16 * Math.sqrt(density)));
      const pV = Math.max(12, Math.round(18 * Math.sqrt(density)));
      for (let p = 0; p < totalPetals; p++) {
        for (let iu = 0; iu < pU; iu++) {
          const u = (iu + 0.5) / pU;
          for (let iv = 0; iv < pV; iv++) {
            const v = (iv + 0.5) / pV;
            appendPointWithNormal(points, (uu, vv) => evalDahliaPetalPoint(uu, vv, p, totalPetals, bloom), u, v, thornDetail);
          }
        }
      }
    }

    // 2. Sample 5 Calyx Sepals (shared across all models, reflexes with bloom)
    const sepalU = Math.max(9, Math.round(12 * Math.sqrt(density)));
    const sepalV = Math.max(14, Math.round(20 * Math.sqrt(density)));
    for (let s = 0; s < 5; s++) {
      for (let ia = 0; ia < sepalU; ia++) {
        const a = (ia + 0.5) / sepalU;
        for (let ib = 0; ib < sepalV; ib++) {
          const b = (ib + 0.5) / sepalV;
          appendPointWithNormal(points, (uu, vv) => evalSepalPoint(uu, vv, s, bloom), a, b, thornDetail);
        }
      }
    }

    return points;
  }

  /**
   * Generates the bloom-independent foliage point cloud (leaves, stem, receptacle, thorns).
   */
  function generateStaticFoliageCloud(options) {
    const opts = options || {};
    const density = typeof opts.density === 'number' ? clamp(opts.density, 0.4, 2.2) : 1.0;
    const thornDetail = typeof opts.thornDetail === 'number' ? clamp(opts.thornDetail, 0, 1) : 0.7;

    const points = [];

    // 1. Sample 2 Serrated Leaves (dense sampling for solid leaf blades)
    const leafU = Math.max(18, Math.round(26 * Math.sqrt(density)));
    const leafV = Math.max(24, Math.round(34 * Math.sqrt(density)));
    for (let l = 0; l < 2; l++) {
      for (let ia = 0; ia < leafU; ia++) {
        const a = (ia + 0.5) / leafU;
        for (let ib = 0; ib < leafV; ib++) {
          const b = (ib + 0.5) / leafV;
          appendPointWithNormal(points, (uu, vv) => evalSerratedLeafPoint(uu, vv, l), a, b, thornDetail);
        }
      }
    }

    // 2. Sample Stem & Receptacle
    const stemU = Math.max(15, Math.round(20 * Math.sqrt(density)));
    const stemV = Math.max(48, Math.round(74 * Math.sqrt(density)));
    for (let ia = 0; ia < stemU; ia++) {
      const a = (ia + 0.5) / stemU;
      for (let ib = 0; ib < stemV; ib++) {
        const b = (ib + 0.5) / stemV;
        appendPointWithNormal(points, (uu, vv) => evalStemAndReceptacle(uu, vv, thornDetail), a, b, thornDetail);
      }
    }

    // 3. Sample 6 Explicit Hooked Thorns
    if (thornDetail > 0.05) {
      const tU = Math.max(6, Math.round(8 * Math.sqrt(density)));
      const tV = Math.max(8, Math.round(12 * Math.sqrt(density)));
      for (let t = 0; t < 6; t++) {
        for (let iu = 0; iu < tU; iu++) {
          const u = (iu + 0.5) / tU;
          for (let iv = 0; iv < tV; iv++) {
            const v = (iv + 0.5) / tV;
            appendPointWithNormal(points, (uu, vv) => evalThornPoint(uu, vv, t, thornDetail), u, v, thornDetail);
          }
        }
      }
    }

    return points;
  }

  function generateRosePointCloud(options) {
    const head = generateFlowerHeadCloud(options);
    const foliage = generateStaticFoliageCloud(options);
    return head.concat(foliage);
  }

  return {
    clamp,
    lerp,
    smoothstep,
    getStemSpine,
    evalCortesPetal,
    evalNylanderRosePoint,
    evalFibonacciPetalPoint,
    evalLotusPetalPoint,
    evalDahliaPetalPoint,
    evalSepalPoint,
    evalSerratedLeafPoint,
    evalStemAndReceptacle,
    evalThornPoint,
    generateFlowerHeadCloud,
    generateStaticFoliageCloud,
    generateRosePointCloud
  };
});
