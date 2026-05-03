import matplotlib.pyplot as plt
import numpy as np
import torchaudio

DRY_PATH = "data/real/dry_aligned.wav"
WET_PATH = "data/real/wet_aligned.wav"

dry_t, sr_dry = torchaudio.load(DRY_PATH)
wet_t, sr_wet = torchaudio.load(WET_PATH)

print(f"Dry: shape={dry_t.shape}, sr={sr_dry}")
print(f"Wet: shape={wet_t.shape}, sr={sr_wet}")

assert sr_dry == sr_wet, f"Sample rates diferentes: {sr_dry} vs {sr_wet}"
sr = sr_dry

dry = dry_t[0]
wet = wet_t[0]

print(f"Duração dry: {len(dry) / sr:.2f} s")
print(f"Duração wet: {len(wet) / sr:.2f} s")

N = min(len(dry), len(wet))
dry = dry[:N]
wet = wet[:N]

# Janela no meio do ficheiro
WINDOW_SIZE = sr * 5  # 5 segundos
start = max((N - WINDOW_SIZE) // 2, 0)
x = dry[start : start + WINDOW_SIZE].numpy().astype(np.float64)
y = wet[start : start + WINDOW_SIZE].numpy().astype(np.float64)

# Normalização correcta para correlação no intervalo [-1, +1]
x = x - x.mean()
y = y - y.mean()
x_norm = np.sqrt(np.dot(x, x))
y_norm = np.sqrt(np.dot(y, y))

MAX_LAG = 3000
lags = np.arange(-MAX_LAG, MAX_LAG + 1)
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
best_lag = lags[best_idx]
best_corr = correlations[best_idx]
zero_corr = correlations[MAX_LAG]

print(f"\n--- Resultados da cross-correlation ---")
print(f"Offset óptimo: {best_lag} amostras")
print(f"Em milissegundos a {sr} Hz: {1000 * best_lag / sr:.2f} ms")
print(f"Correlação no offset óptimo: {best_corr:.4f}")
print(f"Correlação a offset zero: {zero_corr:.4f}")

plt.figure(figsize=(12, 4))
plt.plot(lags, correlations, linewidth=0.7)
plt.axvline(best_lag, color="red", linestyle="--",
            label=f"Pico: {best_lag} samples ({1000 * best_lag / sr:.2f} ms)")
plt.axvline(0, color="gray", linestyle=":", label="Zero")
plt.xlabel("Lag (amostras)  —  positivo = wet atrasado em relação ao dry")
plt.ylabel("Correlação normalizada")
plt.title("Cross-correlation entre dry e wet")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig("alignment_check.png", dpi=120)
plt.show()