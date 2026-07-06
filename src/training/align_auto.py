import matplotlib.pyplot as plt
import numpy as np
import soundfile as sf
import torchaudio

DRY_PATH = "data/real/dry.wav"
WET_PATH = "data/real/wet.wav"
OUT_DRY = "data/real/dry_aligned.wav"
OUT_WET = "data/real/wet_aligned.wav"
PLOT_PATH = "alignment_report.png"

MAX_LAG = 3000
WINDOW_SECONDS = 5


def cross_correlate(dry, wet, sr, max_lag=MAX_LAG, window_seconds=WINDOW_SECONDS):
    """Devolve (lags, correlations, best_lag, best_corr, zero_corr)."""
    N = min(len(dry), len(wet))
    window = min(sr * window_seconds, N)
    start = max((N - window) // 2, 0)

    x = dry[start : start + window].numpy().astype(np.float64)
    y = wet[start : start + window].numpy().astype(np.float64)

    x = x - x.mean()
    y = y - y.mean()
    x_norm = np.sqrt(np.dot(x, x))
    y_norm = np.sqrt(np.dot(y, y))

    lags = np.arange(-max_lag, max_lag + 1)
    correlations = np.zeros(len(lags))
    for i, lag in enumerate(lags):
        if lag >= 0:
            x_seg = x[: len(x) - lag]
            y_seg = y[lag:]
        else:
            x_seg = x[-lag:]
            y_seg = y[: len(y) + lag]
        correlations[i] = np.dot(x_seg, y_seg) / (x_norm * y_norm)

    best_idx = correlations.argmax()
    return (
        lags,
        correlations,
        int(lags[best_idx]),
        correlations[best_idx],
        correlations[max_lag],
    )


def apply_lag(dry, wet, lag):
    """Alinha dry/wet cortando o início do sinal adiantado."""
    if lag < 0:
        # wet adiantado: cortar do início do dry
        n = -lag
        dry_a = dry[n:]
        wet_a = wet[: len(dry_a)]
        print(f"Lag negativo: {n} amostras cortadas do início do dry")
    elif lag > 0:
        # wet atrasado: cortar do início do wet
        wet_a = wet[lag:]
        dry_a = dry[: len(wet_a)]
        print(f"Lag positivo: {lag} amostras cortadas do início do wet")
    else:
        dry_a, wet_a = dry, wet
        print("Lag zero: sem corte")

    N = min(len(dry_a), len(wet_a))
    return dry_a[:N], wet_a[:N]


def waveform_window(dry, wet, sr, seconds=0.05):
    """Pequena janela centrada no ponto de maior energia do dry, para overlay visual."""
    N = min(len(dry), len(wet))
    d = dry[:N].numpy()
    w = wet[:N].numpy()
    # encontrar zona com energia (evitar silêncio no início)
    hop = sr // 10
    energies = [np.abs(d[i : i + hop]).mean() for i in range(0, N - hop, hop)]
    center = (int(np.argmax(energies)) * hop) + hop // 2
    half = int(sr * seconds / 2)
    s = max(center - half, 0)
    e = min(center + half, N)
    t = np.arange(s, e) / sr
    return t, d[s:e], w[s:e]


# ---------------------------------------------------------------
# 1. Carregar
# ---------------------------------------------------------------
dry_t, sr_dry = torchaudio.load(DRY_PATH)
wet_t, sr_wet = torchaudio.load(WET_PATH)
assert sr_dry == sr_wet, f"Sample rates diferentes: {sr_dry} vs {sr_wet}"
sr = sr_dry
dry = dry_t[0]
wet = wet_t[0]
print(f"Originais: dry={len(dry)}, wet={len(wet)}, sr={sr}")

# ---------------------------------------------------------------
# 2. Cross-correlation ANTES
# ---------------------------------------------------------------
lags_b, corr_b, best_lag, best_corr, zero_corr_b = cross_correlate(dry, wet, sr)
print("\n--- Antes do alinhamento ---")
print(f"Offset óptimo: {best_lag} amostras ({1000 * best_lag / sr:.2f} ms)")
print(f"Correlação no offset óptimo: {best_corr:.4f}")
print(f"Correlação a offset zero: {zero_corr_b:.4f}")

# ---------------------------------------------------------------
# 3. Aplicar o lag automaticamente
# ---------------------------------------------------------------
dry_aligned, wet_aligned = apply_lag(dry, wet, best_lag)
N = len(dry_aligned)
print(f"Depois do corte: {N} amostras ({N / sr:.2f} s)")

# ---------------------------------------------------------------
# 4. Cross-correlation DEPOIS (verificação)
# ---------------------------------------------------------------
lags_a, corr_a, best_lag_after, best_corr_after, zero_corr_a = cross_correlate(
    dry_aligned, wet_aligned, sr
)
print("\n--- Depois do alinhamento ---")
print(
    f"Offset residual: {best_lag_after} amostras ({1000 * best_lag_after / sr:.2f} ms)"
)
print(f"Correlação no pico: {best_corr_after:.4f}")
print(f"Correlação a offset zero: {zero_corr_a:.4f}")
if best_lag_after != 0:
    print("Aviso: o pico não ficou exactamente em zero — verificar!")

# ---------------------------------------------------------------
# 5. Guardar
# ---------------------------------------------------------------
sf.write(OUT_DRY, dry_aligned.numpy().astype(np.float32), sr, subtype="PCM_24")
sf.write(OUT_WET, wet_aligned.numpy().astype(np.float32), sr, subtype="PCM_24")

dry_check, _ = torchaudio.load(OUT_DRY)
wet_check, _ = torchaudio.load(OUT_WET)
print("\n--- Verificação em disco ---")
print(f"dry_aligned: {dry_check.shape[1]} amostras")
print(f"wet_aligned: {wet_check.shape[1]} amostras")
print(f"Match: {dry_check.shape[1] == N and wet_check.shape[1] == N}")

# ---------------------------------------------------------------
# 6. Gráfico antes/depois (correlação + overlay de waveforms)
# ---------------------------------------------------------------
fig, axes = plt.subplots(2, 2, figsize=(14, 8))

# Correlação antes
ax = axes[0, 0]
ax.plot(lags_b, corr_b, linewidth=0.7)
ax.axvline(
    best_lag,
    color="red",
    linestyle="--",
    label=f"Pico: {best_lag} samples ({1000 * best_lag / sr:.2f} ms)",
)
ax.axvline(0, color="gray", linestyle=":", label="Zero")
ax.set_title("Cross-correlation — ANTES")
ax.set_xlabel("Lag (amostras)")
ax.set_ylabel("Correlação normalizada")
ax.legend()
ax.grid(True, alpha=0.3)

# Correlação depois
ax = axes[0, 1]
ax.plot(lags_a, corr_a, linewidth=0.7, color="green")
ax.axvline(
    best_lag_after, color="red", linestyle="--", label=f"Pico: {best_lag_after} samples"
)
ax.axvline(0, color="gray", linestyle=":", label="Zero")
ax.set_title("Cross-correlation — DEPOIS")
ax.set_xlabel("Lag (amostras)")
ax.set_ylabel("Correlação normalizada")
ax.legend()
ax.grid(True, alpha=0.3)

# Overlay de waveforms antes
t, d_seg, w_seg = waveform_window(dry, wet, sr)
ax = axes[1, 0]
ax.plot(t, d_seg, label="dry", linewidth=0.8)
ax.plot(t, w_seg, label="wet", linewidth=0.8, alpha=0.7)
ax.set_title("Waveforms — ANTES (zona de maior energia)")
ax.set_xlabel("Tempo (s)")
ax.legend()
ax.grid(True, alpha=0.3)

# Overlay de waveforms depois
t, d_seg, w_seg = waveform_window(dry_aligned, wet_aligned, sr)
ax = axes[1, 1]
ax.plot(t, d_seg, label="dry", linewidth=0.8)
ax.plot(t, w_seg, label="wet", linewidth=0.8, alpha=0.7)
ax.set_title("Waveforms — DEPOIS")
ax.set_xlabel("Tempo (s)")
ax.legend()
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(PLOT_PATH, dpi=120)
print(f"\nGráfico guardado em {PLOT_PATH}")
plt.show()
