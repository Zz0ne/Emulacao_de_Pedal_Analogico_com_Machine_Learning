/* ============================================================
   abx-engine.js — motor do teste ABX (lógica pura, sem DOM)
   Responsabilidades:
   - criar nova sessão com 12 trials
   - aleatorizar X = A ou B em cada trial
   - registar respostas e determinar acertos
   - persistir estado via Storage
   ============================================================ */

window.AbxEngine = (function () {
    'use strict';

    const N_TRIALS = 12;
    const SESSION_KEY = 'abx:currentSession';
    const HISTORY_KEY = 'abx:sessionHistory';

    /**
     * Gera ID de sessão curto, prefixado com o número de estudante.
     * Exemplo: "2201022-9d3f"
     */
    function generateSessionId() {
        const random = Math.floor(Math.random() * 0xFFFF)
            .toString(16)
            .padStart(4, '0');
        return '2201022-' + random;
    }

    /**
     * Cria uma nova sessão com N_TRIALS trials.
     * Cada trial tem xIs aleatoriamente 'A' ou 'B'.
     */
    function createSession() {
        const trials = [];
        for (let i = 0; i < N_TRIALS; i++) {
            trials.push({
                index: i,
                seed: i,                                      // para síntese reproduzível
                xIs: Math.random() < 0.5 ? 'A' : 'B',         // X = A ou B, aleatório
                answer: null,                                  // resposta do utilizador
                correct: null,                                 // acertou?
                answeredAt: null                               // timestamp ISO
            });
        }

        const session = {
            id: generateSessionId(),
            startedAt: new Date().toISOString(),
            finishedAt: null,
            trials: trials,
            currentIndex: 0,
            totalTrials: N_TRIALS
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
        trial.correct = (answer === trial.xIs);
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

    function archiveSession(session) {
        const history = Storage.get(HISTORY_KEY) || [];
        history.push(session);
        Storage.set(HISTORY_KEY, history.slice(-20)); // Mantém últimas 20 para evitar encher o localStorage.
    }

    function loadHistory() {
        return Storage.get(HISTORY_KEY) || [];
    }

    function clearHistory() {
        Storage.remove(HISTORY_KEY);
    }

    /**
     * Gera os buffers A, B, X para o trial corrente.
     * X é o mesmo buffer que A ou B, dependendo de trial.xIs.
     */
    function loadTrialAudio(session) {
        const trial = session.trials[session.currentIndex];
        const seed = trial.seed;

        const bufferA = AudioSynth.presets.hardware(seed);
        const bufferB = AudioSynth.presets.emulation(seed);
        const bufferX = trial.xIs === 'A' ? bufferA : bufferB;

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
        const hits = answered.filter(function (t) { return t.correct; }).length;
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
            significant: pValue !== null && pValue < 0.05
        };
    }

    return {
        N_TRIALS: N_TRIALS,
        createSession: createSession,
        loadSession: loadSession,
        clearSession: clearSession,
        submitAnswer: submitAnswer,
        loadHistory: loadHistory,
        clearHistory: clearHistory,
        loadTrialAudio: loadTrialAudio,
        summarize: summarize
    };
})();