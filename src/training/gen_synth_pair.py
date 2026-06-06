import torch
import torchaudio
import math

SAMPLE_RATE = 48000
DURATION_S = 3.0
N_SAMPLES = int(SAMPLE_RATE * DURATION_S)

torch.manual_seed(42)
t = torch.arange(N_SAMPLES) / SAMPLE_RATE   # tempo em segundos
# dry = (
#     0.3 * torch.sin(2 * math.pi * 55 * t)    # fundamental Lá grave
#   + 0.2 * torch.sin(2 * math.pi * 110 * t)   # 1ª harmónica
#   + 0.1 * torch.sin(2 * math.pi * 220 * t)   # 2ª harmónica
#   + 0.05 * torch.randn(N_SAMPLES)             # pouco ruído
# )
dry = torch.randn(N_SAMPLES) * 0.2

print("Tipo do objecto :", type(dry))
print("Dtype interno   :", dry.dtype)
print("Shape           :", dry.shape)
print("Device          :", dry.device)
print("Primeiras 5     :", dry[:5])
print("Peak absoluto   :", dry.abs().max().item())

GAIN = 50.0
wet = torch.tanh(GAIN * dry)

print("\n--- Depois do tanh ---")
print("Shape           :", wet.shape)
print("Peak absoluto   :", wet.abs().max().item())
print("RMS dry         :", dry.pow(2).mean().sqrt().item())
print("RMS wet         :", wet.pow(2).mean().sqrt().item())
print("Primeiras 5 dry :", dry[:5])
print("Primeiras 5 wet :", wet[:5])

# torchaudio espera shape [channels, samples], não [samples]
dry_to_save = dry.unsqueeze(0)
wet_to_save = wet.unsqueeze(0)

print("\n--- Shapes para guardar ---")
print("dry original   :", dry.shape)
print("dry_to_save    :", dry_to_save.shape)

torchaudio.save("data/synthetic/dry.wav", dry_to_save, SAMPLE_RATE)
torchaudio.save("data/synthetic/wet.wav", wet_to_save, SAMPLE_RATE)