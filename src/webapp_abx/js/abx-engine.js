/* ============================================================
   abx-engine.js — motor do teste ABX (lógica pura, sem DOM)
   Responsabilidades:
   - buscar os 12 trial templates da base de dados
   - criar nova sessão com 12 trials
   - aleatorizar X = A ou B em cada trial
   - registar respostas e determinar acertos
   - persistir estado via Storage
   ============================================================ */

const SESSIONS_URL = "backend/api/sessions.php";

window.AbxEngine = (function () {
  "use strict";

  const N_TRIALS = 12;
  const SESSION_KEY = "abx:currentSession";
  const HISTORY_KEY = "abx:sessionHistory";
  const TEMPLATES_URL = "backend/api/templates.php";

  /**
   * Busca os 12 trial templates da base de dados.
   * Devolve o array de templates ordenado por trial_index.
   */
  async function fetchTemplates() {
    const response = await fetch(TEMPLATES_URL);
    if (!response.ok) {
      throw new Error(
        "Falha ao obter os templates do servidor (HTTP " +
          response.status +
          ").",
      );
    }

    const data = await response.json();
    const templates = data.templates || [];

    if (templates.length !== N_TRIALS) {
      throw new Error(
        "Esperados " +
          N_TRIALS +
          " templates, recebidos " +
          templates.length +
          ".",
      );
    }

    return templates;
  }

  /**
   * Cria uma nova sessão com N_TRIALS trials, buscando primeiro os
   * parâmetros de síntese da base de dados.
   * Cada trial tem xIs aleatoriamente 'A' ou 'B' e embebe o template
   * correspondente, para a síntese ser reproduzível e auditável.
   */
  async function createSession() {
    const templates = await fetchTemplates();

    const trials = [];
    for (let i = 0; i < N_TRIALS; i++) {
      const template = templates[i];
      trials.push({
        index: i,
        xIs: Math.random() < 0.5 ? "A" : "B",
        template: template,
        answer: null,
        correct: null,
        answeredAt: null,
      });
    }

    const session = {
      id: null, // atribuído pelo servidor na submissão
      startedAt: new Date().toISOString(),
      finishedAt: null,
      trials: trials,
      currentIndex: 0,
      totalTrials: N_TRIALS,
    };

    Storage.set(SESSION_KEY, session);
    return session;
  }

  function loadSession() {
    return Storage.get(SESSION_KEY);
  }

  function clearSession() {
    Storage.remove(SESSION_KEY);
  }

  function submitAnswer(session, answer) {
    const trial = session.trials[session.currentIndex];
    trial.answer = answer;
    trial.correct = answer === trial.xIs;
    trial.answeredAt = new Date().toISOString();

    session.currentIndex++;
    const done = session.currentIndex >= session.totalTrials;

    if (done) {
      session.finishedAt = new Date().toISOString();
      archiveSession(session);
    }

    Storage.set(SESSION_KEY, session);
    return { correct: trial.correct, done: done };
  }

  /**
   * Submete uma sessão concluída à base de dados via POST.
   * O servidor atribui o id e devolve-o; gravamo-lo na sessão local.
   * Devolve o id atribuído.
   */
  async function submitSession(session) {
    const summary = summarize(session);

    const payload = {
      started_at: session.startedAt,
      finished_at: session.finishedAt,
      total_trials: session.totalTrials,
      hits: summary.hits,
      p_value: summary.pValue,
      d_prime: summary.dPrime,
      trials: session.trials.map(function (t) {
        return {
          trial_index: t.index,
          x_is: t.xIs,
          answer: t.answer,
          answered_at: t.answeredAt,
          // 'correct' não é enviado — o servidor recalcula-o
        };
      }),
    };

    const response = await fetch(SESSIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Falha na submissão (HTTP " + response.status + ").",
      );
    }

    // Guarda o id atribuído pelo servidor na sessão local e no histórico
    session.id = data.id;
    Storage.set(SESSION_KEY, session);
    Storage.set("abx:lastSubmittedId", data.id);

    return data.id;
  }

  function archiveSession(session) {
    const history = Storage.get(HISTORY_KEY) || [];
    history.push(session);
    Storage.set(HISTORY_KEY, history.slice(-20)); // Mantém últimas 20 para não encher o localStorage.
  }

  function loadHistory() {
    return Storage.get(HISTORY_KEY) || [];
  }

  function clearHistory() {
    Storage.remove(HISTORY_KEY);
  }

  /**
   * Gera os buffers A, B, X para o trial corrente, usando os parâmetros
   * de síntese embebidos no template do trial.
   * X é o mesmo buffer que A ou B, dependendo de trial.xIs.
   */
  function loadTrialAudio(session) {
    const trial = session.trials[session.currentIndex];
    const tpl = trial.template;

    const opts = {
      freq: tpl.frequency_hz,
      duration: tpl.duration_ms / 1000,
      drive: tpl.drive,
      waveform: tpl.waveform,
    };

    const bufferA = AudioSynth.generateBuffer(
      Object.assign({}, opts, { flavour: "hardware" }),
    );
    const bufferB = AudioSynth.generateBuffer(
      Object.assign({}, opts, { flavour: "emulation" }),
    );
    const bufferX = trial.xIs === "A" ? bufferA : bufferB;

    return { A: bufferA, B: bufferB, X: bufferX, trial: trial };
  }

  /**
   * Sumário estatístico de uma sessão.
   * Precisa que o Stats já esteja carregado.
   */
  function summarize(session) {
    const answered = session.trials.filter(function (t) {
      return t.answer !== null;
    });
    const hits = answered.filter(function (t) {
      return t.correct;
    }).length;
    const n = answered.length;
    const pct = n > 0 ? (hits / n) * 100 : 0;

    const pValue = n > 0 ? Stats.binomialTailPValue(hits, n, 0.5) : null;
    const dPrime = n > 0 ? Stats.dPrimeABX(hits, n) : null;

    return {
      total: n,
      hits: hits,
      misses: n - hits,
      percentage: pct,
      pValue: pValue,
      dPrime: dPrime,
      significant: pValue !== null && pValue < 0.05,
    };
  }

  return {
    N_TRIALS: N_TRIALS,
    createSession: createSession,
    loadSession: loadSession,
    clearSession: clearSession,
    submitAnswer: submitAnswer,
    submitSession: submitSession,
    loadHistory: loadHistory,
    clearHistory: clearHistory,
    loadTrialAudio: loadTrialAudio,
    summarize: summarize,
  };
})();

