/* ============================================================
   results-page.js — controlador da página results.html
   Os dados são consultados à base de dados (GET /api/sessions),
   identificando a sessão pelo id atribuído no fim do teste.
   ============================================================ */

(function () {
  "use strict";

  const SESSIONS_URL = "backend/api/sessions.php";
  const LAST_ID_KEY = "abx:lastSubmittedId";

  const screens = {
    empty: document.getElementById("screen-empty"),
    results: document.getElementById("screen-results"),
  };

  function show(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].hidden = k !== name;
    });
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-PT", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return iso;
    }
  }

  /**
   * Constrói o sumário estatístico a partir dos dados da sessão vindos
   * do servidor. O servidor já traz hits, p_value e d_prime calculados,
   * por isso aqui só os reorganizamos no formato que o render espera.
   */
  function summaryFromServer(session) {
    const total = session.total_trials;
    const hits = session.hits;
    const pct = total > 0 ? (hits / total) * 100 : 0;
    const pValue = session.p_value;

    return {
      total: total,
      hits: hits,
      misses: total - hits,
      percentage: pct,
      pValue: pValue,
      dPrime: session.d_prime,
      significant: pValue !== null && pValue < 0.05,
    };
  }

  function interpret(summary) {
    if (summary.total === 0) {
      return "Sem dados suficientes.";
    }
    if (summary.hits === summary.total) {
      return (
        "Acertou em todos os " +
        summary.total +
        " trials. Com p-value ≈ " +
        Stats.formatPValue(summary.pValue) +
        ", a hipótese de que não distingue " +
        "o hardware da emulação é rejeitada com forte confiança. Consegue " +
        "ouvir a diferença."
      );
    }
    if (summary.significant) {
      return (
        "Com " +
        summary.hits +
        " acertos em " +
        summary.total +
        " trials " +
        "(p ≈ " +
        Stats.formatPValue(summary.pValue) +
        "), a sua performance é " +
        "estatisticamente significativa (α = 0.05). Consegue distinguir " +
        "hardware de emulação."
      );
    }
    if (summary.percentage < 50) {
      return (
        "Com " +
        summary.hits +
        " acertos em " +
        summary.total +
        ", está " +
        "abaixo do valor esperado por acaso (50%). Isto não indica capacidade " +
        "de distinção — é compatível com respostas aleatórias. Interprete como " +
        '"indistinguíveis".'
      );
    }
    return (
      "Com " +
      summary.hits +
      " acertos em " +
      summary.total +
      " trials " +
      "(p ≈ " +
      Stats.formatPValue(summary.pValue) +
      "), não há evidência " +
      "estatística de que consiga distinguir hardware de emulação (α = 0.05). " +
      "Este é o resultado pretendido pelo projeto: indistinguibilidade percetual."
    );
  }

  function renderTrialPills(session) {
    const list = document.getElementById("res-trials");
    list.innerHTML = "";
    session.trials.forEach(function (t, idx) {
      const pill = document.createElement("div");
      // os trials vêm do servidor: x_is, answer, correct (boolean)
      pill.className = "trial-pill " + (t.correct ? "hit" : "miss");
      pill.textContent = String(idx + 1).padStart(2, "0");
      pill.title =
        "Trial " +
        (idx + 1) +
        ": X = " +
        t.x_is +
        ", respondeu " +
        t.answer +
        " → " +
        (t.correct ? "acerto" : "erro");
      list.appendChild(pill);
    });
  }

  function describeListener(session) {
    const parts = [];
    if (session.listener_age_band != null) {
      parts.push("idade " + session.listener_age_band);
    }
    if (session.listener_experience != null) {
      parts.push("experiência " + session.listener_experience + "/5");
    }
    if (session.used_headphones != null) {
      parts.push("auscultadores: " + (session.used_headphones ? "sim" : "não"));
    }
    return parts.join(" · ");
  }

  function render(session) {
    document.getElementById("res-session-id").textContent = "#" + session.id;
    document.getElementById("res-date").textContent = formatDate(
      session.finished_at,
    );
    document.getElementById("res-listener").textContent =
      describeListener(session);

    const summary = summaryFromServer(session);

    document.getElementById("res-total").textContent = summary.total;
    document.getElementById("res-hits").textContent = summary.hits;
    document.getElementById("res-pct").textContent =
      Math.round(summary.percentage) + "%";
    document.getElementById("res-pvalue").textContent = Stats.formatPValue(
      summary.pValue,
    );
    document.getElementById("res-dprime").textContent =
      summary.dPrime !== null ? Number(summary.dPrime).toFixed(2) : "—";
    document.getElementById("res-pct-label").textContent =
      Math.round(summary.percentage) + "%";

    requestAnimationFrame(function () {
      setTimeout(function () {
        document.getElementById("res-bar").style.width =
          summary.percentage + "%";
      }, 100);
    });

    document.getElementById("res-interpretation").textContent =
      interpret(summary);
    renderTrialPills(session);
  }

  /**
   * Vai buscar a sessão ao servidor pelo id e renderiza-a.
   */
  async function loadAndRender(id) {
    const response = await fetch(
      SESSIONS_URL + "?id=" + encodeURIComponent(id),
    );

    if (response.status === 404) {
      show("empty");
      return;
    }
    if (!response.ok) {
      throw new Error(
        "Falha ao obter a sessão (HTTP " + response.status + ").",
      );
    }

    const data = await response.json();
    show("results");
    render(data.session);
  }

  async function init() {
    const lastId = Storage.get(LAST_ID_KEY);

    if (!lastId) {
      show("empty");
      return;
    }

    try {
      await loadAndRender(lastId);
    } catch (e) {
      console.error("Erro ao carregar resultados:", e.message);
      show("empty");
    }
  }

  document.getElementById("btn-clear").addEventListener("click", function () {
    if (
      confirm(
        "Limpar a referência à última sessão neste dispositivo? Os dados no servidor mantêm-se.",
      )
    ) {
      Storage.remove(LAST_ID_KEY);
      show("empty");
    }
  });

  init();
})();

