/**
 * ROSA MATHEMATICA — Procedural WebAudio Generative Soundscape & Harmonic Chime Engine
 * Synthesizes an ambient Lydian botanical drone that opens its filter with the rose's bloom
 * state, plus crystalline FM celesta chimes triggered by wind gusts and petal interactions.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AsciiRoseAudio = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // D Lydian / F# minor 9th ethereal frequencies (Hz)
  const CHIME_SCALE = [
    293.66, // D4
    329.63, // E4
    369.99, // F#4
    415.30, // G#4
    440.00, // A4
    493.88, // B4
    554.37, // C#5
    587.33, // D5
    659.25, // E5
    739.99, // F#5
    880.00, // A5
    987.77, // B5
    1108.73 // C#6
  ];

  const DRONE_FREQS = [
    146.83, // D3
    220.00, // A3
    277.18, // C#4
    329.63  // E4
  ];

  class BotanicalAudioEngine {
    constructor() {
      this.ctx = null;
      this.isPlaying = false;
      this.masterGain = null;
      this.filterNode = null;
      this.analyser = null;
      this.freqData = null;
      this.droneOscs = [];
      this.chimeTimer = 0;
    }

    _initContext() {
      if (this.ctx) return true;
      const AudioCtx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
      if (!AudioCtx) return false;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0001;

      // Warm low-pass filter modulated by bloom state
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 420;
      this.filterNode.Q.value = 1.8;

      // Stereo feedback delay for spacious cathedral/conservatory ambiance
      this.delayLeft = this.ctx.createDelay(1.0);
      this.delayRight = this.ctx.createDelay(1.0);
      this.delayLeft.delayTime.value = 0.36;
      this.delayRight.delayTime.value = 0.52;

      const fbGain = this.ctx.createGain();
      fbGain.gain.value = 0.32;

      this.delayLeft.connect(this.delayRight);
      this.delayRight.connect(fbGain);
      fbGain.connect(this.delayLeft);

      // Analyser for visual reactivity
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.85;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

      this.filterNode.connect(this.masterGain);
      this.filterNode.connect(this.delayLeft);
      this.delayLeft.connect(this.masterGain);
      this.delayRight.connect(this.masterGain);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Start warm detuned drone voices
      DRONE_FREQS.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const voiceGain = this.ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = (idx - 1.5) * 6;
        voiceGain.gain.value = idx === 0 ? 0.14 : 0.07;

        osc.connect(voiceGain);
        voiceGain.connect(this.filterNode);
        osc.start();
        this.droneOscs.push({ osc, voiceGain, baseFreq: freq });
      });

      return true;
    }

    toggle() {
      if (!this._initContext()) return false;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const currentGain = Math.max(0.0001, this.masterGain.gain.value || 0.0001);
      if (this.isPlaying) {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(currentGain, now);
        this.masterGain.gain.setTargetAtTime(0.0001, now, 0.35);
        this.isPlaying = false;
      } else {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(currentGain, now);
        this.masterGain.gain.setTargetAtTime(0.24, now, 0.6);
        this.isPlaying = true;
        this.playChime(0, 0.6);
      }
      return this.isPlaying;
    }

    setBackgroundPaused(paused) {
      if (!this.ctx) return;
      if (paused) {
        if (this.ctx.state === 'running' && typeof this.ctx.suspend === 'function') {
          this.ctx.suspend().catch(() => {});
        }
      } else if (this.isPlaying) {
        if (this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function') {
          this.ctx.resume().catch(() => {});
        }
      }
    }

    /**
     * Plays a delicate FM glass-harp / celesta chime
     * @param {number} pan - Stereo pan in [-1, 1]
     * @param {number} intensity - Velocity in [0.1, 1.0]
     */
    playChime(pan, intensity) {
      if (!this.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const vel = Math.max(0.08, Math.min(1.0, intensity || 0.5));

      const noteIdx = Math.floor(Math.random() * CHIME_SCALE.length);
      const freq = CHIME_SCALE[noteIdx];

      const carrier = this.ctx.createOscillator();
      const modulator = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();
      const envGain = this.ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.value = freq;

      // Harmonic FM ratio 2:1 for crystalline bell timbre
      modulator.type = 'sine';
      modulator.frequency.value = freq * 2.0;
      modGain.gain.setValueAtTime(freq * 0.45 * vel, now);
      modGain.gain.exponentialRampToValueAtTime(0.1, now + 0.8);

      envGain.gain.setValueAtTime(0.0001, now);
      envGain.gain.linearRampToValueAtTime(0.065 * vel, now + 0.015);
      envGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(envGain);

      let panner = null;
      if (this.ctx.createStereoPanner) {
        panner = this.ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, pan || 0));
        envGain.connect(panner);
        panner.connect(this.filterNode);
      } else {
        envGain.connect(this.filterNode);
      }

      carrier.onended = () => {
        try {
          carrier.disconnect();
          modulator.disconnect();
          modGain.disconnect();
          envGain.disconnect();
          if (panner) panner.disconnect();
        } catch (err) {
          // Ignore already disconnected nodes
        }
      };

      carrier.start(now);
      modulator.start(now);
      carrier.stop(now + 2.5);
      modulator.stop(now + 2.5);
    }

    playWindCascade() {
      if (!this.isPlaying || !this.ctx) return;
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          this.playChime((i / 2) - 1, 0.65 - i * 0.08);
        }, i * 95);
      }
    }

    update(dt, bloom, windStrength) {
      if (!this.isPlaying || !this.ctx || !this.filterNode) return 0;
      const now = this.ctx.currentTime;

      // Filter opens warmly as the rose blooms (240 Hz in tight bud -> 1400 Hz in full bloom)
      const targetCutoff = 240 + Math.pow(Math.max(0, Math.min(1.2, bloom)), 1.5) * 1150 + windStrength * 320;
      this.filterNode.frequency.setTargetAtTime(targetCutoff, now, 0.12);

      // Occasional generative ambient chimes
      this.chimeTimer += dt * (0.45 + windStrength * 1.1);
      if (this.chimeTimer > 2.2) {
        this.chimeTimer = 0;
        if (Math.random() < 0.72) {
          this.playChime((Math.random() - 0.5) * 1.4, 0.35 + Math.random() * 0.35);
        }
      }

      if (this.analyser && this.freqData) {
        this.analyser.getByteFrequencyData(this.freqData);
        let sum = 0;
        for (let i = 0; i < 24; i++) {
          sum += this.freqData[i];
        }
        return Math.min(1.0, (sum / (24 * 255)) * 2.2);
      }
      return 0;
    }
  }

  return {
    BotanicalAudioEngine
  };
});
