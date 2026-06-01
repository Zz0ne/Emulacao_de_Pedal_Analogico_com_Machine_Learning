/* ============================================================
   test-page.js — controlador da página test.html
   Faz a ponte entre DOM e AbxEngine.
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
      b.textContent = "▶\u00A0\u00A0reproduzir " + sample;
    });
  }

  function loadCurrentTrial() {
    audio = AbxEngine.loadTrialAudio(session);

    trialCurrent.textContent = String(session.currentIndex + 1).padStart(
      2,
      "0",
    );
    trialTotal.textContent = String(session.totalTrials).padStart(2, "0");
    sessionId.textContent = session.id;
    renderProgress();

    selectedAnswer = null;
    answerButtons.forEach(function (b) {
      b.classList.remove("selected");
    });
    btnSubmit.disabled = true;
    stopCurrent();
  }

  // Handlers de eventos
  async function handleStart() {
    AbxEngine.clearSession(); // descarta qualquer sessão pendente
    try {
      session = await AbxEngine.createSession();
    } catch (e) {
      alert("Não foi possível iniciar o teste: " + e.message);
      return;
    }
    show("test");
    loadCurrentTrial();
  }

  function handlePlay(btn) {
    const sample = btn.getAttribute("data-sample");
    const wasPlaying = btn.classList.contains("playing");
    stopCurrent();
    if (wasPlaying) return; // segundo clique = parar

    btn.classList.add("playing");
    btn.textContent = "■\u00A0\u00A0a reproduzir " + sample;

    currentPlayback = AudioSynth.play(audio[sample], function () {
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
      // com o servidor — se falhar, os resultados não se perdem
      try {
        await AbxEngine.submitSession(session);
      } catch (e) {
        console.warn("Falha ao submeter a sessão ao servidor:", e.message);
      }
    } else {
      loadCurrentTrial();
    }
  }

  // ---------- Wiring ----------
  btnStart.addEventListener("click", handleStart);
  btnSubmit.addEventListener("click", handleSubmit);

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
  }
})();

