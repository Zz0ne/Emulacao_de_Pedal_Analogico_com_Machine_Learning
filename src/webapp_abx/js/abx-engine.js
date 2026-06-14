/* ============================================================
   abx-engine.js — motor do teste ABX (lógica, sem DOM)
   Responsabilidades:
   - carregar o manifesto estático de estímulos (stimuli.json)
   - obter um token de sessão do servidor (anti-abuso)
   - criar uma sessão com tantos trials quantos os pares do manifesto
     (número DINÂMICO: acrescentar pares ao manifesto cresce o teste)
   - balancear X: metade dos trials com X = A, metade com X = B
   - aleatorizar a ordem de apresentação dos pares por participante
   - carregar/reproduzir os WAVs de cada trial via AudioPlayer
   - registar respostas e determinar acertos
   - persistir estado via Storage e submeter à base de dados
   ============================================================ */

window.AbxEngine = (function () {
  "use strict";

  // Mínimo viável: precisamos de pelo menos um par para haver teste.
  const MIN_TRIALS = 1;
  // Tecto defensivo, alinhado com o CHECK de total_trials no servidor.
  const MAX_TRIALS = 50;

  const SESSION_KEY = "abx:currentSession";
  const HISTORY_KEY = "abx:sessionHistory";
  const MANIFEST_URL = "stimuli.json";
  const SESSIONS_URL = "backend/api/sessions.php";
  const TOKEN_URL = "backend/api/session_token.php";

  // O manifesto é estático; carregamo-lo uma vez e reutilizamos
  // (ex.: o ecrã de introdução pede a contagem, depois createSession reaproveita).
  let manifestCache = null;

  /**
   * Baralha um array in-place (Fisher–Yates) e devolve-o.
   * Usado para o balanceamento de X e para a ordem dos pares.
   */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /**
   * Carrega (e memoiza) o manifesto estático dos estímulos.
   * O número de trials é o número de pares do manifesto — dinâmico.
   * Valida apenas que há pares suficientes e não excede o tecto.
   */
  async function fetchManifest() {
    if (manifestCache) {
      return manifestCache;
    }

    const response = await fetch(MANIFEST_URL);
    if (!response.ok) {
      throw new Error(
        "Falha ao obter o manifesto de estímulos (HTTP " +
          response.status +
          ").",
      );
    }

    const data = await response.json();
    const trials = (data && data.trials) || [];

    if (trials.length < MIN_TRIALS) {
      throw new Error("O manifesto não tem pares de estímulos.");
    }
    if (trials.length > MAX_TRIALS) {
      throw new Error(
        "O manifesto tem " +
          trials.length +
          " pares; o máximo suportado é " +
          MAX_TRIALS +
          ".",
      );
    }

    manifestCache = trials;
    return trials;
  }

  /**
   * Número de trials da sessão = número de pares no manifesto.
   * Útil para o ecrã de introdução mostrar a contagem real.
   */
  async function getTrialCount() {
    const manifest = await fetchManifest();
    return manifest.length;
  }

  /**
   * Pede ao servidor um token de sessão. O token prova, na submissão,
   * que a sessão começou pela aplicação (e não por um POST direto).
   * Se o servidor não estiver disponível, devolve null — o teste continua
   * a funcionar localmente; só a submissão poderá ser recusada.
   */
  async function fetchToken() {
    try {
      const response = await fetch(TOKEN_URL);
      if (!response.ok) return null;
      const data = await response.json();
      return data.token || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Cria uma nova sessão a partir do manifesto.
   *
   * Número de trials = nº de pares no manifesto (dinâmico).
   * Balanceamento: metade dos trials têm X = A e metade X = B (em vez de
   * sortear cada trial de forma independente); com nº ímpar fica o mais
   * próximo possível. A ordem de apresentação dos pares é aleatorizada
   * por participante.
   *
   * @param {Object} listener  { experience: 1-5, headphones: boolean }
   */
  async function createSession(listener) {
    const manifest = await fetchManifest();
    const token = await fetchToken();
    const n = manifest.length;

    // Pool de X balanceado: metade A, metade B, depois baralhado.
    const half = Math.floor(n / 2);
    const xPool = [];
    for (let i = 0; i < n; i++) {
      xPool.push(i < half ? "A" : "B");
    }
    shuffle(xPool);

    // Ordem de apresentação dos pares do manifesto, aleatorizada.
    const order = shuffle(
      manifest.map(function (_, i) {
        return i;
      }),
    );

    const trials = order.map(function (manifestIdx, position) {
      const pair = manifest[manifestIdx];
      return {
        index: position, // posição de apresentação (0..n-1), para a UI
        manifestIndex: pair.trial_index, // identidade do par no manifesto
        label: pair.label,
        urlA: pair.url_a,
        urlB: pair.url_b,
        xIs: xPool[position],
        answer: null,
        correct: null,
        answeredAt: null,
      };
    });

    const session = {
      id: null, // atribuído pelo servidor na submissão
      token: token,
      listenerExperience: listener ? listener.experience : null,
      usedHeadphones: listener ? !!listener.headphones : null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      trials: trials,
      currentIndex: 0,
      totalTrials: n,
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
      token: session.token,
      listener_experience: session.listenerExperience,
      used_headphones: session.usedHeadphones,
      started_at: session.startedAt,
      finished_at: session.finishedAt,
      total_trials: session.totalTrials,
      hits: summary.hits,
      p_value: summary.pValue,
      d_prime: summary.dPrime,
      trials: session.trials.map(function (t) {
        return {
          trial_index: t.manifestIndex,
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
   * Carrega os buffers A, B e X do trial corrente, descodificando os WAVs
   * do manifesto via AudioPlayer (com cache). X aponta para o mesmo buffer
   * que A ou B, conforme trial.xIs.
   * É assíncrona: a reprodução só fica disponível após o carregamento.
   */
  async function loadTrialAudio(session) {
    const trial = session.trials[session.currentIndex];

    const buffers = await AudioPlayer.preload([trial.urlA, trial.urlB]);
    const bufferA = buffers[0];
    const bufferB = buffers[1];
    const bufferX = trial.xIs === "A" ? bufferA : bufferB;

    return { A: bufferA, B: bufferB, X: bufferX, trial: trial };
  }

  /**
   * Pré-carrega (sem reproduzir) os WAVs de um trial pelo seu índice de
   * apresentação. Falhas são silenciadas — é só uma otimização; o
   * carregamento definitivo (com tratamento de erro) acontece em
   * loadTrialAudio quando o trial fica ativo.
   */
  function preloadTrial(session, position) {
    const trial = session.trials[position];
    if (!trial) return Promise.resolve();
    return AudioPlayer.preload([trial.urlA, trial.urlB]).catch(function () {});
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
    MIN_TRIALS: MIN_TRIALS,
    MAX_TRIALS: MAX_TRIALS,
    getTrialCount: getTrialCount,
    createSession: createSession,
    loadSession: loadSession,
    clearSession: clearSession,
    submitAnswer: submitAnswer,
    submitSession: submitSession,
    loadHistory: loadHistory,
    clearHistory: clearHistory,
    loadTrialAudio: loadTrialAudio,
    preloadTrial: preloadTrial,
    summarize: summarize,
  };
})();
