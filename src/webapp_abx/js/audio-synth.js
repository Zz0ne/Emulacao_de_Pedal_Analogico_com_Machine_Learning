/* ============================================================
   audio-synth.js — síntese de samples placeholder
   Gera buffers de áudio que simulam:
   - "hardware": baixo distorcido com soft-clip tipo tanh (analógico)
   - "emulation": mesmo sinal com uma variação subtil na distorção
   No projeto final, estes serão substituídos por gravações reais.
   ============================================================ */

window.AudioSynth = (function () {
    'use strict';

    let audioCtx = null;

    function getContext() {
        if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            audioCtx = new Ctx();
        }
        // browsers mais recentes suspendem o contexto até haver interação
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    /**
     * Gera um AudioBuffer com um sinal de baixo distorcido.
     * @param {Object} opts
     * @param {number} opts.freq      frequência fundamental em Hz
     * @param {number} opts.duration  duração em segundos
     * @param {number} opts.drive     ganho pré-distorção (1 = limpo, 10 = muito distorcido)
     * @param {'hardware'|'emulation'} opts.flavour
     * @returns {AudioBuffer}
     */
    function generateBuffer(opts) {
        const ctx = getContext();
        const sampleRate = ctx.sampleRate;
        const length = Math.floor(sampleRate * opts.duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        const freq = opts.freq;
        const drive = opts.drive || 5;
        const flavour = opts.flavour || 'hardware';

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;  // tempo em segundos

            // envelope ADSR simplificado: attack rápido, sustain, release suave
            let env;
            if (t < 0.01) env = t / 0.01;
            else if (t > opts.duration - 0.1) env = (opts.duration - t) / 0.1;
            else env = 1.0;

            // sinal: fundamental + harmónicos (som mais rico que uma sine pura)
            let signal =
                Math.sin(2 * Math.PI * freq * t) +
                0.5 * Math.sin(2 * Math.PI * freq * 2 * t) +
                0.3 * Math.sin(2 * Math.PI * freq * 3 * t) +
                0.15 * Math.sin(2 * Math.PI * freq * 4 * t);

            signal *= env * drive;

            // distorção: hardware usa tanh (soft-clip clássico),
            // emulation usa variante assimétrica subtil
            let distorted;
            if (flavour === 'hardware') {
                distorted = Math.tanh(signal);
            } else {
                const s = signal * 0.95;
                distorted = s / (1 + Math.abs(s));
                distorted += 0.03 * Math.sin(2 * Math.PI * freq * 5 * t) * env;
            }

            data[i] = distorted * 0.3; // headroom: não queremos clipping digital
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

        if (typeof onEnded === 'function') {
            source.onended = onEnded;
        }

        source.start();

        return {
            stop: function () {
                try { source.stop(); } catch (e) { /* já parou */ }
            }
        };
    }

    /**
     * Presets que o motor ABX consome.
     * O seed varia ligeiramente a frequência, dando variedade entre trials.
     */
    const presets = {
        hardware: function (seed) {
            const freq = 55 + (seed % 7) * 3;  // ~55 Hz (A1) com variação
            return generateBuffer({
                freq: freq, duration: 3.0, drive: 6, flavour: 'hardware'
            });
        },
        emulation: function (seed) {
            const freq = 55 + (seed % 7) * 3;
            return generateBuffer({
                freq: freq, duration: 3.0, drive: 6, flavour: 'emulation'
            });
        }
    };

    return {
        getContext: getContext,
        generateBuffer: generateBuffer,
        play: play,
        presets: presets
    };
})();