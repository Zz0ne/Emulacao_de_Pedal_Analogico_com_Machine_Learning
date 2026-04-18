/* ============================================================
   results-page.js — controlador da página results.html
   ============================================================ */

(function () {
    'use strict';

    const screens = {
        empty:   document.getElementById('screen-empty'),
        results: document.getElementById('screen-results')
    };

    function show(name) {
        Object.keys(screens).forEach(function (k) {
            screens[k].hidden = (k !== name);
        });
    }

    function formatDate(iso) {
        try {
            const d = new Date(iso);
            return d.toLocaleString('pt-PT', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return iso;
        }
    }

    function interpret(summary) {
        if (summary.total === 0) {
            return 'Sem dados suficientes.';
        }
        if (summary.hits === summary.total) {
            return 'Acertou em todos os ' + summary.total + ' trials. Com p-value ≈ ' +
                Stats.formatPValue(summary.pValue) + ', a hipótese de que não distingue ' +
                'o hardware da emulação é rejeitada com forte confiança. Consegue ' +
                'ouvir a diferença.';
        }
        if (summary.significant) {
            return 'Com ' + summary.hits + ' acertos em ' + summary.total + ' trials ' +
                '(p ≈ ' + Stats.formatPValue(summary.pValue) + '), a sua performance é ' +
                'estatisticamente significativa (α = 0.05). Consegue distinguir ' +
                'hardware de emulação.';
        }
        if (summary.percentage < 50) {
            return 'Com ' + summary.hits + ' acertos em ' + summary.total + ', está ' +
                'abaixo do valor esperado por acaso (50%). Isto não indica capacidade ' +
                'de distinção — é compatível com respostas aleatórias. Interprete como ' +
                '"indistinguíveis".';
        }
        return 'Com ' + summary.hits + ' acertos em ' + summary.total + ' trials ' +
            '(p ≈ ' + Stats.formatPValue(summary.pValue) + '), não há evidência ' +
            'estatística de que consiga distinguir hardware de emulação (α = 0.05). ' +
            'Este é o resultado pretendido pelo projeto: indistinguibilidade percetual.';
    }

    function renderTrialPills(session) {
        const list = document.getElementById('res-trials');
        list.innerHTML = '';
        session.trials.forEach(function (t, idx) {
            const pill = document.createElement('div');
            pill.className = 'trial-pill ' + (t.correct ? 'hit' : 'miss');
            pill.textContent = String(idx + 1).padStart(2, '0');
            pill.title = 'Trial ' + (idx + 1) + ': X = ' + t.xIs +
                ', respondeu ' + t.answer +
                ' → ' + (t.correct ? 'acerto' : 'erro');
            list.appendChild(pill);
        });
    }

    function render(session) {
        document.getElementById('res-session-id').textContent = session.id;
        document.getElementById('res-date').textContent = formatDate(session.finishedAt);

        const summary = AbxEngine.summarize(session);

        document.getElementById('res-total').textContent  = summary.total;
        document.getElementById('res-hits').textContent   = summary.hits;
        document.getElementById('res-pct').textContent    = Math.round(summary.percentage) + '%';
        document.getElementById('res-pvalue').textContent = Stats.formatPValue(summary.pValue);
        document.getElementById('res-dprime').textContent =
            summary.dPrime !== null ? summary.dPrime.toFixed(2) : '—';
        document.getElementById('res-pct-label').textContent = Math.round(summary.percentage) + '%';

        // anima a barra ligeiramente depois de renderizar
        requestAnimationFrame(function () {
            setTimeout(function () {
                document.getElementById('res-bar').style.width = summary.percentage + '%';
            }, 100);
        });

        document.getElementById('res-interpretation').textContent = interpret(summary);
        renderTrialPills(session);
    }

    function init() {
        const history = AbxEngine.loadHistory();
        if (history.length === 0) {
            show('empty');
            return;
        }
        const last = history[history.length - 1];
        show('results');
        render(last);
    }

    document.getElementById('btn-clear').addEventListener('click', function () {
        if (confirm('Apagar todas as sessões guardadas localmente?')) {
            AbxEngine.clearHistory();
            AbxEngine.clearSession();
            show('empty');
        }
    });

    init();
})();