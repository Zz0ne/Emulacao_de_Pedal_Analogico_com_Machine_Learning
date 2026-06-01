/* ============================================================
   backoffice-page.js — controlador da página backoffice.html
   Edita os 12 trial templates via API REST (GET para carregar,
   PUT para guardar). Reutiliza o AudioSynth para pré-escuta.
   ============================================================ */

(function () {
  "use strict";

  const TEMPLATES_URL = "backend/api/templates.php";

  let templates = [];
  let selectedIndex = null;
  let currentPlayback = null;

  const grid = document.getElementById("bo-grid");
  const editor = document.getElementById("bo-editor");
  const editorIndex = document.getElementById("bo-editor-index");
  const status = document.getElementById("bo-status");

  const fields = {
    label: document.getElementById("f-label"),
    waveform: document.getElementById("f-waveform"),
    frequency: document.getElementById("f-frequency"),
    duration: document.getElementById("f-duration"),
    drive: document.getElementById("f-drive"),
  };

  const btnListenA = document.getElementById("btn-listen-a");
  const btnListenB = document.getElementById("btn-listen-b");
  const btnStop = document.getElementById("btn-stop");
  const btnSave = document.getElementById("btn-save");

  function setStatus(message, kind) {
    status.textContent = message;
    status.className = "bo-status" + (kind ? " " + kind : "");
  }

  function clearStatus() {
    setStatus("", "");
  }

  function stopAudio() {
    if (currentPlayback) {
      currentPlayback.stop();
      currentPlayback = null;
    }
  }

  /**
   * Lê os valores ATUAIS do formulário (não os guardados) e sintetiza
   * o buffer da variante pedida, para pré-escuta antes de submeter.
   */
  function listen(flavour) {
    stopAudio();

    const opts = {
      freq: parseFloat(fields.frequency.value),
      duration: parseInt(fields.duration.value, 10) / 1000,
      drive: parseFloat(fields.drive.value),
      waveform: fields.waveform.value,
      flavour: flavour,
    };

    // validação mínima antes de sintetizar (evita NaN)
    if (isNaN(opts.freq) || isNaN(opts.duration) || isNaN(opts.drive)) {
      setStatus("Valores inválidos para reprodução.", "error");
      return;
    }

    const buffer = AudioSynth.generateBuffer(opts);
    currentPlayback = AudioSynth.play(buffer, function () {
      currentPlayback = null;
    });
  }

  function renderGrid() {
    grid.innerHTML = "";
    templates.forEach(function (tpl) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "bo-cell";
      if (tpl.trial_index === selectedIndex) {
        cell.classList.add("selected");
      }
      cell.textContent = String(tpl.trial_index).padStart(2, "0");
      cell.title = tpl.label;
      cell.addEventListener("click", function () {
        selectSlot(tpl.trial_index);
      });
      grid.appendChild(cell);
    });
  }

  function selectSlot(index) {
    stopAudio();
    clearStatus();
    selectedIndex = index;

    const tpl = templates.find(function (t) {
      return t.trial_index === index;
    });
    if (!tpl) return;

    editorIndex.textContent = String(index).padStart(2, "0");
    fields.label.value = tpl.label;
    fields.waveform.value = tpl.waveform;
    fields.frequency.value = tpl.frequency_hz;
    fields.duration.value = tpl.duration_ms;
    fields.drive.value = tpl.drive;

    editor.hidden = false;
    renderGrid(); // re-render para destacar o selecionado
  }

  async function save() {
    if (selectedIndex === null) return;
    stopAudio();

    const payload = {
      label: fields.label.value.trim(),
      waveform: fields.waveform.value,
      frequency_hz: parseFloat(fields.frequency.value),
      duration_ms: parseInt(fields.duration.value, 10),
      drive: parseFloat(fields.drive.value),
    };

    setStatus("a guardar…", "");

    try {
      const response = await fetch(
        TEMPLATES_URL + "?index=" + encodeURIComponent(selectedIndex),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "HTTP " + response.status);
      }

      // Atualiza a cópia em memória com os valores submetidos
      const tpl = templates.find(function (t) {
        return t.trial_index === selectedIndex;
      });
      tpl.label = payload.label;
      tpl.waveform = payload.waveform;
      tpl.frequency_hz = payload.frequency_hz;
      tpl.duration_ms = payload.duration_ms;
      tpl.drive = payload.drive;

      renderGrid();
      setStatus("guardado ✓", "ok");
    } catch (e) {
      setStatus("erro: " + e.message, "error");
    }
  }

  async function init() {
    try {
      const response = await fetch(TEMPLATES_URL);
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      const data = await response.json();
      templates = data.templates || [];
    } catch (e) {
      grid.innerHTML =
        '<p class="bo-status error">Falha ao carregar os ' +
        "templates do servidor: " +
        e.message +
        "</p>";
      return;
    }

    renderGrid();
  }

  btnListenA.addEventListener("click", function () {
    listen("hardware");
  });
  btnListenB.addEventListener("click", function () {
    listen("emulation");
  });
  btnStop.addEventListener("click", stopAudio);
  btnSave.addEventListener("click", save);

  init();
})();
