import torch
import torchaudio
from torch.utils.data import DataLoader

from dataset import AudioPairDataset, split_dataset_random
from model import LSTMEmulator
from loss import ESRLoss

DRY_PATH = "data/real/dry_aligned.wav"
WET_PATH = "data/real/wet_aligned.wav"

# Hiperparâmetros
WINDOW_SIZE = 2048
TBPTT_CHUNK = 1024
BATCH_SIZE = 32
HIDDEN_SIZE = 24
LEARNING_RATE = 5e-3
N_EPOCHS = 180
VAL_RATIO = 0.2
SEED = 42

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"A usar device: {device}")
if device.type == "cuda":
    print(f"GPU: {torch.cuda.get_device_name(0)}")

torch.manual_seed(SEED)

# Descobrir o tamanho real do ficheiro
info_t, sr = torchaudio.load(DRY_PATH)
total_samples = info_t.shape[1]
print(f"Sample rate: {sr}")
print(f"Total samples: {total_samples} ({total_samples / sr:.2f} s)")

# Carregar o dataset completo e fazer split aleatório por janelas
full_dataset = AudioPairDataset(DRY_PATH, WET_PATH, WINDOW_SIZE)
train_dataset, val_dataset = split_dataset_random(
    full_dataset, val_ratio=VAL_RATIO, seed=SEED
)
print(f"Total de janelas: {len(full_dataset)}")
print(f"Treino:    {len(train_dataset)} janelas")
print(f"Validação: {len(val_dataset)} janelas")

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

# Modelo, loss, optimizer
model = LSTMEmulator(hidden_size=HIDDEN_SIZE).to(device)
loss_fn = ESRLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)

print("\nA treinar...")
for epoch in range(N_EPOCHS):
    # Treino
    model.train()
    train_losses = []
    for batch_x, batch_y in train_loader:
        batch_x = batch_x.to(device)
        batch_y = batch_y.to(device)

        chunks_x = batch_x.split(TBPTT_CHUNK, dim=1)
        chunks_y = batch_y.split(TBPTT_CHUNK, dim=1)
        hidden = None
        for chunk_x, chunk_y in zip(chunks_x, chunks_y):
            optimizer.zero_grad()
            lstm_out, hidden = model.lstm(chunk_x, hidden)
            y_pred = model.linear(lstm_out)
            loss = loss_fn(y_pred, chunk_y)
            loss.backward()
            hidden = (hidden[0].detach(), hidden[1].detach())
            optimizer.step()
            train_losses.append(loss.item())

    # Validação
    model.eval()
    val_losses = []
    with torch.no_grad():
        for batch_x, batch_y in val_loader:
            batch_x = batch_x.to(device)
            batch_y = batch_y.to(device)
            y_pred = model(batch_x)
            loss = loss_fn(y_pred, batch_y)
            val_losses.append(loss.item())

    avg_train = sum(train_losses) / len(train_losses)
    avg_val = sum(val_losses) / len(val_losses)
    print(
        f"Epoch {epoch + 1:3d}/{N_EPOCHS} | train: {avg_train:.6f} | val: {avg_val:.6f}"
    )

print("\nTreino concluído.")

# Guardar pesos em CPU (portável)
state_dict_cpu = {k: v.cpu() for k, v in model.state_dict().items()}
torch.save(state_dict_cpu, "model/model_weights.pt")
print("Pesos guardados em model/model_weights.pt")
