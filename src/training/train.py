import torch
from torch.utils.data import DataLoader
from dataset import AudioPairDataset
from model import LSTMEmulator
from loss import ESRLoss

# Hiperparâmetros
WINDOW_SIZE = 2048
BATCH_SIZE = 16
HIDDEN_SIZE = 8
LEARNING_RATE = 5e-3
N_EPOCHS = 200
TBPTT_CHUNK = 1024
SEED = 42
SAMPLE_RATE = 48000
DURATION_S = 3.0

torch.manual_seed(SEED)

# Dados
total_samples = SAMPLE_RATE * DURATION_S
split_idx = int(total_samples * 0.8)

train_dataset = AudioPairDataset("data/synthetic/dry.wav", "data/synthetic/wet.wav", WINDOW_SIZE,
                                 start=0, end=split_idx)
val_dataset = AudioPairDataset("data/synthetic/dry.wav", "data/synthetic/wet.wav", WINDOW_SIZE,
                               start=split_idx, end=None)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

print(f"Treino: {len(train_dataset)} janelas")
print(f"Validação: {len(val_dataset)} janelas")

# Modelo, loss, optimizer
model = LSTMEmulator(hidden_size=HIDDEN_SIZE)
loss_fn = ESRLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)


# Loop de treino
print("\nA treinar...")
for epoch in range(N_EPOCHS):
    # === Fase de treino ===
    model.train()
    train_losses = []

    for batch_x, batch_y in train_loader:
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

    # === Fase de validação ===
    model.eval()
    val_losses = []

    with torch.no_grad():
        for batch_x, batch_y in val_loader:
            y_pred = model(batch_x)
            loss = loss_fn(y_pred, batch_y)
            val_losses.append(loss.item())

    avg_train = sum(train_losses) / len(train_losses)
    avg_val = sum(val_losses) / len(val_losses)
    print(f"Epoch {epoch + 1:3d}/{N_EPOCHS} | train: {avg_train:.6f} | val: {avg_val:.6f}")

print("\nTreino concluído.")

# Guardar pesos
torch.save(model.state_dict(), "model/model_weights.pt")
print("Pesos guardados em model/model_weights.pt")