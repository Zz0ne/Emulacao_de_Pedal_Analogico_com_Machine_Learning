/* ============================================================
   stats.js — estatística para análise ABX
   - binomialPMF(k, n, p)     : P(X = k)
   - binomialTailPValue(k,n,p): P(X >= k)  sob H0 = p
   - dPrimeABX(hits, n)       : d' para ABX duplo-cego
   Tudo em JS puro, sem dependências.
   ============================================================ */

window.Stats = (function () {
    'use strict';

    /* ---------- Funções auxiliares ---------- */

    function logFactorial(n) {
        let acc = 0;
        for (let i = 2; i <= n; i++) acc += Math.log(i);
        return acc;
    }

    function logBinomial(n, k) {
        return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
    }

    /* ---------- PMF e p-value ---------- */

    /**
     * PMF binomial: P(X = k) para X ~ Bin(n, p).
     * Usa logaritmos para evitar overflow.
     */
    function binomialPMF(k, n, p) {
        if (k < 0 || k > n) return 0;
        if (p === 0) return k === 0 ? 1 : 0;
        if (p === 1) return k === n ? 1 : 0;
        const logP = logBinomial(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p);
        return Math.exp(logP);
    }

    /**
     * p-value unilateral: P(X >= k) sob H0.
     * No contexto ABX, p = 0.5 (probabilidade de acerto por acaso).
     */
    function binomialTailPValue(k, n, p) {
        if (p === undefined) p = 0.5;
        let sum = 0;
        for (let i = k; i <= n; i++) {
            sum += binomialPMF(i, n, p);
        }
        return Math.min(1, Math.max(0, sum));
    }

    /* ---------- d-prime ---------- */

    /**
     * Aproximação da inversa da CDF normal padrão (z-score).
     * Algoritmo de Beasley-Springer-Moro.
     * É o que em tabelas estatísticas nos dá z para uma probabilidade.
     */
    function inverseNormalCDF(p) {
        if (p <= 0 || p >= 1) return 0;

        const a = [-3.969683028665376e+01, 2.209460984245205e+02,
            -2.759285104469687e+02, 1.383577518672690e+02,
            -3.066479806614716e+01, 2.506628277459239e+00];
        const b = [-5.447609879822406e+01, 1.615858368580409e+02,
            -1.556989798598866e+02, 6.680131188771972e+01,
            -1.328068155288572e+01];
        const c = [-7.784894002430293e-03, -3.223964580411365e-01,
            -2.400758277161838e+00, -2.549732539343734e+00,
            4.374664141464968e+00,  2.938163982698783e+00];
        const d = [ 7.784695709041462e-03,  3.224671290700398e-01,
            2.445134137142996e+00,  3.754408661907416e+00];

        const pLow = 0.02425;
        const pHigh = 1 - pLow;
        let q, r;

        if (p < pLow) {
            q = Math.sqrt(-2 * Math.log(p));
            return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
                ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
        } else if (p <= pHigh) {
            q = p - 0.5;
            r = q * q;
            return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
                (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
        } else {
            q = Math.sqrt(-2 * Math.log(1 - p));
            return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
                ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
        }
    }

    /**
     * d-prime para ABX.
     * Baseado em Macmillan & Creelman (2005), "Detection Theory".
     * Interpretação:
     *   d' = 0   → não distingue
     *   d' = 1   → distinção subtil
     *   d' > 2   → distinção clara
     */
    function dPrimeABX(hits, n) {
        if (n === 0) return 0;
        let pHit = hits / n;

        // correção de Hautus para proporções nos extremos (evita infinitos)
        if (pHit >= 1) pHit = 1 - 1 / (2 * n);
        if (pHit <= 0) pHit = 1 / (2 * n);

        if (pHit <= 0.5) return 0;
        return Math.sqrt(2) * inverseNormalCDF(pHit);
    }

    /* ---------- Formatação ---------- */

    function formatPValue(p) {
        if (p === null || p === undefined) return '—';
        if (p < 0.001) return '< 0.001';
        return p.toFixed(3);
    }

    /* ---------- API pública ---------- */

    return {
        binomialPMF: binomialPMF,
        binomialTailPValue: binomialTailPValue,
        dPrimeABX: dPrimeABX,
        inverseNormalCDF: inverseNormalCDF,
        formatPValue: formatPValue
    };
})();