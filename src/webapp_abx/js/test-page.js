/* ============================================================
   test-page.js — controlador da página test.html
   Faz a ponte entre DOM e AbxEngine. O áudio é carregado de
   WAVs reais (AudioPlayer), de forma assíncrona e com tratamento
   de erros de rede/ficheiro em falta.
   ============================================================ */

(function () {
  "use strict";

  // Referências ao DOM
  const screens = {
    intro: document.getElementById("screen-intro"),
    test: document.getElementById("screen-test"),
    done: document.getElementById("screen-done"),
  };

  const btnStart = document.getElementById("btn-start");
  const btnSubmit = document.getElementById("btn-submit");
  const playButtons = document.querySelectorAll(".play-btn");
  const answerButtons = document.querySelectorAll(".answer-btn");
  const progressBar = document.getElementById("progress-bar");
  const trialCurrent = document.getElementById("trial-current");
  const trialTotal = document.getElementById("trial-total");
  const sessionId = document.getElementById("session-id");
  const listenerForm = document.getElementById("listener-form");

  const audioStatus = document.getElementById("audio-status");
  const audioStatusText = document.getElementById("audio-status-text");
  const btnRetryAudio = document.getElementById("btn-retry-audio");

  const introTrialCount = document.getElementById("intro-trial-count");
  const statTrials = document.getElementById("stat-trials");
  const statDuration = document.getElementById("stat-duration");

  const sampleGrid = document.querySelector(".sample-grid");
  const trialToast = document.getElementById("trial-toast");

  // Estado local
  let session = null;
  let selectedAnswer = null;
  let audio = null; // { A, B, X } — buffers do trial atual
  let currentPlayback = null; // handle da reprodução em curso

  // Helpers de UI
  function show(screenName) {
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== screenName;
    });
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function renderProgress() {
    progressBar.innerHTML = "";
    for (let i = 0; i < session.totalTrials; i++) {
      const cell = document.createElement("div");
      cell.className = "progress-cell";
      if (i < session.currentIndex) {
        cell.classList.add("done");
      } else if (i === session.currentIndex) {
        cell.classList.add("current");
      }
      progressBar.appendChild(cell);
    }
  }

  function stopCurrent() {
    if (currentPlayback) {
      currentPlayback.stop();
      currentPlayback = null;
    }
    playButtons.forEach(function (b) {
      b.classList.remove("playing");
      const sample = b.getAttribute("data-sample");
      b.textContent = "▶  reproduzir " + sample;
    });
  }

  function setPlayEnabled(enabled) {
    playButtons.forEach(function (b) {
      b.disabled = !enabled;
    });
  }

  function showAudioMessage(text, withRetry) {
    audioStatusText.textContent = text;
    btnRetryAudio.hidden = !withRetry;
    audioStatus.hidden = false;
  }

  function hideAudioMessage() {
    audioStatus.hidden = true;
    btnRetryAudio.hidden = true;
    audioStatusText.textContent = "";
  }

  let toastTimer = null;
  function flashToast(text) {
    if (!trialToast) return;
    trialToast.textContent = text;
    trialToast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      trialToast.classList.remove("show");
    }, 1100);
  }

  function animateTrialEnter() {
    if (!sampleGrid) return;
    // Remover + forçar reflow reinicia a animação a cada trial.
    sampleGrid.classList.remove("trial-enter");
    void sampleGrid.offsetWidth;
    sampleGrid.classList.add("trial-enter");
  }

  // ---------- Validação do formulário do ouvinte ----------
  function readListener() {
    const exp = listenerForm.querySelector('input[name="experience"]:checked');
    const hp = listenerForm.querySelector('input[name="headphones"]:checked');
    const age = listenerForm.querySelector('input[name="age"]:checked');
    if (!exp || !hp || !age) return null;
    return {
      experience: parseInt(exp.value, 10),
      headphones: hp.value === "yes",
      ageBand: age.value,
    };
  }

  function refreshStartEnabled() {
    btnStart.disabled = readListener() === null;
  }

  // ---------- Carregar o trial corrente (áudio assíncrono) ----------
  async function loadCurrentTrial() {
    trialCurrent.textContent = pad2(session.currentIndex + 1);
    trialTotal.textContent = pad2(session.totalTrials);
    sessionId.textContent = session.id !== null ? session.id : "—";
    renderProgress();
    animateTrialEnter();

    selectedAnswer = null;
    answerButtons.forEach(function (b) {
      b.classList.remove("selected");
    });
    btnSubmit.disabled = true;
    stopCurrent();

    // Áudio: enquanto carrega, bloqueia a reprodução e mostra estado.
    setPlayEnabled(false);
    showAudioMessage("a carregar áudio…", false);

    try {
      audio = await AbxEngine.loadTrialAudio(session);
      hideAudioMessage();
      setPlayEnabled(true);
      // Pré-carrega o trial seguinte para a transição ser instantânea.
      AbxEngine.preloadTrial(session, session.currentIndex + 1);
    } catch (e) {
      audio = null;
      setPlayEnabled(false);
      showAudioMessage(
        "Não foi possível carregar o áudio deste trial. " + e.message,
        true,
      );
    }
  }

  // ---------- Handlers de eventos ----------
  async function handleStart() {
    const listener = readListener();
    if (!listener) return; // botão devia estar desativado, mas garantimos

    btnStart.disabled = true;
    AbxEngine.clearSession(); // descarta qualquer sessão pendente
    try {
      session = await AbxEngine.createSession(listener);
    } catch (e) {
      alert("Não foi possível iniciar o teste: " + e.message);
      btnStart.disabled = false;
      return;
    }
    show("test");
    loadCurrentTrial();
  }

  function handlePlay(btn) {
    if (!audio) return; // áudio ainda não carregou
    const sample = btn.getAttribute("data-sample");
    const wasPlaying = btn.classList.contains("playing");
    stopCurrent();
    if (wasPlaying) return; // segundo clique = parar

    btn.classList.add("playing");
    btn.textContent = "■  a reproduzir " + sample;

    currentPlayback = AudioPlayer.play(audio[sample], function () {
      stopCurrent();
    });
  }

  function handleAnswerSelect(btn) {
    selectedAnswer = btn.getAttribute("data-answer");
    answerButtons.forEach(function (b) {
      b.classList.remove("selected");
    });
    btn.classList.add("selected");
    btnSubmit.disabled = false;
  }

  async function handleSubmit() {
    if (!selectedAnswer) return;
    stopCurrent();
    const result = AbxEngine.submitAnswer(session, selectedAnswer);

    if (result.done) {
      show("done");
      // O teste terminou e está guardado localmente. Tenta sincronizar
      // com o servidor — se falhar, os resultados não se perdem.
      try {
        await AbxEngine.submitSession(session);
      } catch (e) {
        console.warn("Falha ao submeter a sessão ao servidor:", e.message);
      }
    } else {
      flashToast("✓ resposta registada");
      loadCurrentTrial();
    }
  }

  // ---------- Wiring ----------
  btnStart.addEventListener("click", handleStart);
  btnSubmit.addEventListener("click", handleSubmit);
  listenerForm.addEventListener("change", refreshStartEnabled);
  btnRetryAudio.addEventListener("click", loadCurrentTrial);

  playButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      handlePlay(b);
    });
  });

  answerButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      handleAnswerSelect(b);
    });
  });

  // ---------- Contagem dinâmica de trials no ecrã de introdução ----------
  AbxEngine.getTrialCount()
    .then(function (n) {
      introTrialCount.textContent = String(n);
      statTrials.textContent = String(n);
      // Estimativa grosseira: ~30 s por trial (ouvir A/B/X + decidir).
      statDuration.textContent = "~" + Math.max(1, Math.round(n * 0.5)) + "min";
    })
    .catch(function () {
      introTrialCount.textContent = "?";
      statTrials.textContent = "?";
      statDuration.textContent = "—";
    });

  // ---------- Retomar sessão em curso, se existir ----------
  const existing = AbxEngine.loadSession();
  if (
    existing &&
    !existing.finishedAt &&
    existing.currentIndex < existing.totalTrials
  ) {
    session = existing;
    show("test");
    loadCurrentTrial();
  } else {
    refreshStartEnabled();
  }
})();
