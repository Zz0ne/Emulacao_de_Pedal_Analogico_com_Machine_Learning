/* ============================================================
   audio-player.js — carregamento e reprodução de WAVs reais
   via Web Audio API. Substitui o antigo audio-synth.js.

   - loadBuffer(url): fetch + decodeAudioData, com cache por URL
   - preload(urls):   pré-carrega vários buffers em paralelo
   - play(buffer):    reproduz e devolve um handle com .stop()

   Web Audio (em vez de <audio>) dá-nos reprodução A/B/X com
   latência ~zero, essencial para um teste de discriminação.
   ============================================================ */

window.AudioPlayer = (function () {
  "use strict";

  let audioCtx = null;
  const cache = new Map(); // url -> AudioBuffer já descodificado

  function getContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    // Browsers recentes suspendem o contexto até haver interação do utilizador.
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Carrega e descodifica um WAV, devolvendo um AudioBuffer.
   * O resultado fica em cache por URL — chamadas repetidas não voltam
   * à rede. Lança Error com mensagem amigável em caso de falha.
   */
  async function loadBuffer(url) {
    if (cache.has(url)) {
      return cache.get(url);
    }

    let response;
    try {
      response = await fetch(url);
    } catch (e) {
      throw new Error("Falha de rede ao carregar o áudio (" + url + ").");
    }

    if (!response.ok) {
      throw new Error(
        "Áudio não disponível (" + url + ", HTTP " + response.status + ").",
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const ctx = getContext();

    let buffer;
    try {
      // Forma baseada em Promise (browsers modernos).
      buffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      throw new Error("Não foi possível descodificar o áudio (" + url + ").");
    }

    cache.set(url, buffer);
    return buffer;
  }

  /**
   * Pré-carrega vários URLs em paralelo. Resolve quando todos estiverem
   * descodificados. Útil para preparar o trial seguinte enquanto o
   * participante ainda está no atual.
   */
  function preload(urls) {
    return Promise.all(urls.map(loadBuffer));
  }

  /**
   * Reproduz um buffer. Devolve um "handle" com .stop() para interromper.
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
    loadBuffer: loadBuffer,
    preload: preload,
    play: play,
  };
})();
