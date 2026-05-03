import numpy as np
import soundfile as sf
import torchaudio

DRY_PATH = "data/real/dry.wav"
WET_PATH = "data/real/wet.wav"
LAG_SAMPLES = -241

dry_t, sr = torchaudio.load(DRY_PATH)
wet_t, _ = torchaudio.load(WET_PATH)

dry = dry_t[0]
wet = wet_t[0]

print(f"Originais: dry={len(dry)}, wet={len(wet)}, sr={sr}")
print(f"LAG_SAMPLES = {LAG_SAMPLES}")

if LAG_SAMPLES < 0:
    # wet adiantado: avançar o wet → cortar do início do dry
    n = -LAG_SAMPLES
    dry_aligned = dry[n:]
    wet_aligned = wet[: len(dry_aligned)]
    print(f"Lag negativo: cortei {n} amostras do início do dry")
elif LAG_SAMPLES > 0:
    # wet atrasado: cortar do início do wet
    n = LAG_SAMPLES
    wet_aligned = wet[n:]
    dry_aligned = dry[: len(wet_aligned)]
    print(f"Lag positivo: cortei {n} amostras do início do wet")
else:
    dry_aligned = dry
    wet_aligned = wet
    print("Lag zero: sem corte")

N = min(len(dry_aligned), len(wet_aligned))
dry_aligned = dry_aligned[:N]
wet_aligned = wet_aligned[:N]

print(f"\nDepois do corte: {N} amostras ({N / sr:.2f} s)")

dry_np = dry_aligned.numpy().astype(np.float32)
wet_np = wet_aligned.numpy().astype(np.float32)

sf.write("data/real/dry_aligned.wav", dry_np, sr, subtype="PCM_24")
sf.write("data/real/wet_aligned.wav", wet_np, sr, subtype="PCM_24")

dry_check, _ = torchaudio.load("data/real/dry_aligned.wav")
wet_check, _ = torchaudio.load("data/real/wet_aligned.wav")
print(f"\n--- Verificação ---")
print(f"dry_aligned no disco: {dry_check.shape[1]} amostras")
print(f"wet_aligned no disco: {wet_check.shape[1]} amostras")
print(f"Match: {dry_check.shape[1] == N and wet_check.shape[1] == N}")