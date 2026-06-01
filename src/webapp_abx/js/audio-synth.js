/* ============================================================
   audio-synth.js — síntese de samples placeholder
   Gera buffers de áudio que simulam:
   - "hardware": baixo distorcido com soft-clip tipo tanh (analógico)
   - "emulation": mesmo sinal com uma variação subtil na distorção
   No projeto final, estes serão substituídos por gravações reais.

   As formas de onda são geradas por síntese aditiva band-limited
   (soma de harmónicas até Nyquist) para evitar aliasing.
   ============================================================ */

window.AudioSynth = (function () {
  "use strict";

  let audioCtx = null;

  function getContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    // browsers mais recentes suspendem o contexto até haver interação
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Calcula o valor de uma forma de onda band-limited num dado instante,
   * por síntese aditiva (soma de harmónicas até Nyquist).
   *
   * @param {string} waveform  'sine' | 'square' | 'sawtooth' | 'triangle'
   * @param {number} freq       frequência fundamental em Hz
   * @param {number} t          tempo em segundos
   * @param {number} nyquist    frequência de Nyquist (sampleRate / 2)
   * @returns {number}          amplitude em [-1, 1] aproximadamente
   */
  function waveSample(waveform, freq, t, nyquist) {
    const w = 2 * Math.PI * freq * t;

    switch (waveform) {
      case "sine":
        return Math.sin(w);

      case "sawtooth": {
        // Todas as harmónicas, amplitude 1/n, sinal alternado.
        // Soma -2/pi * Σ (-1)^n sin(n·w) / n
        let s = 0;
        for (let n = 1; n * freq < nyquist; n++) {
          s += (Math.pow(-1, n) * Math.sin(n * w)) / n;
        }
        return (-2 / Math.PI) * s;
      }

      case "square": {
        // Só harmónicas ímpares, amplitude 1/n.
        // Soma 4/pi * Σ sin(n·w) / n, com n ímpar
        let s = 0;
        for (let n = 1; n * freq < nyquist; n += 2) {
          s += Math.sin(n * w) / n;
        }
        return (4 / Math.PI) * s;
      }

      case "triangle": {
        // Só harmónicas ímpares, amplitude 1/n², sinal alternado.
        // Soma 8/pi² * Σ (-1)^k sin(n·w) / n², n=2k+1
        let s = 0;
        let k = 0;
        for (let n = 1; n * freq < nyquist; n += 2) {
          s += (Math.pow(-1, k) * Math.sin(n * w)) / (n * n);
          k++;
        }
        return (8 / (Math.PI * Math.PI)) * s;
      }

      default:
        // fallback seguro: sine pura
        return Math.sin(w);
    }
  }

  /**
   * Gera um AudioBuffer com um sinal distorcido.
   * @param {Object} opts
   * @param {number} opts.freq       frequência fundamental em Hz
   * @param {number} opts.duration   duração em segundos
   * @param {number} opts.drive      ganho pré-distorção (1 = limpo, 10 = muito)
   * @param {string} opts.waveform   'sine' | 'square' | 'sawtooth' | 'triangle'
   * @param {'hardware'|'emulation'} opts.flavour
   * @returns {AudioBuffer}
   */
  function generateBuffer(opts) {
    const ctx = getContext();
    const sampleRate = ctx.sampleRate;
    const nyquist = sampleRate / 2;
    const length = Math.floor(sampleRate * opts.duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const freq = opts.freq;
    const drive = opts.drive || 5;
    const waveform = opts.waveform || "sine";
    const flavour = opts.flavour || "hardware";

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate; // tempo em segundos

      // envelope ADSR simplificado: attack rápido, release suave
      let env;
      if (t < 0.01) env = t / 0.01;
      else if (t > opts.duration - 0.1) env = (opts.duration - t) / 0.1;
      else env = 1.0;

      // sinal base band-limited, escalado pelo envelope e pelo drive
      let signal = waveSample(waveform, freq, t, nyquist) * env * drive;

      // distorção: hardware usa tanh (soft-clip clássico),
      // emulation usa variante assimétrica subtil
      let distorted;
      if (flavour === "hardware") {
        distorted = Math.tanh(signal);
      } else {
        const s = signal * 0.95;
        distorted = s / (1 + Math.abs(s));
        distorted += 0.03 * Math.sin(2 * Math.PI * freq * 5 * t) * env;
      }

      data[i] = distorted * 0.3; // headroom: evita clipping digital
    }

    return buffer;
  }

  /**
   * Reproduz um buffer. Retorna um "handle" com .stop() para interromper.
   */
  function play(buffer, onEnded) {
    const ctx = getContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    if (typeof onEnded === "function") {
      source.onended = onEnded;
    }

    source.start();

    return {
      stop: function () {
        try {
          source.stop();
        } catch (e) {
          /* já parou */
        }
      },
    };
  }

  return {
    getContext: getContext,
    generateBuffer: generateBuffer,
    play: play,
  };
})();

