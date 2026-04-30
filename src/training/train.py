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
N_EPOCHS = 600
TBPTT_CHUNK = 1024
SEED = 42

torch.manual_seed(SEED)

# Dados
dataset = AudioPairDataset("data/synthetic/dry.wav", "data/synthetic/wet.wav", WINDOW_SIZE)
loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
print(f"Dataset: {len(dataset)} janelas, batches de {BATCH_SIZE}")

# Modelo, loss, optimizer
model = LSTMEmulator(hidden_size=HIDDEN_SIZE)
loss_fn = ESRLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)


# Loop de treino
print("\nA treinar...")

for epoch in range(N_EPOCHS):
    epoch_losses = []
    for batch_x, batch_y in loader:
        # Dividir a janela em chunks ao longo da dimensão temporal
        chunks_x = batch_x.split(TBPTT_CHUNK, dim=1)
        chunks_y = batch_y.split(TBPTT_CHUNK, dim=1)

        # hidden state a zero
        hidden = None

        for chunk_x, chunk_y in zip(chunks_x, chunks_y):
            optimizer.zero_grad()

            # Forward com estado explícito
            lstm_out, hidden = model.lstm(chunk_x, hidden)
            y_pred = model.linear(lstm_out)

            loss = loss_fn(y_pred, chunk_y)
            loss.backward()

            # Cortar gradiente: o estado avança no tempo, mas o grafo de
            # backprop não atravessa para o próximo chunk
            hidden = (hidden[0].detach(), hidden[1].detach())

            optimizer.step()
            epoch_losses.append(loss.item())
    avg_loss = sum(epoch_losses) / len(epoch_losses)
    print(f"Epoch {epoch+1:3d}/{N_EPOCHS} | ESR: {avg_loss:.6f}")

print("\nTreino concluído.")

# Guardar pesos
torch.save(model.state_dict(), "model/model_weights.pt")
print("Pesos guardados em model/model_weights.pt")

# Sanity check: avaliar modelo em alguns samples concretos
model.eval()
with torch.no_grad():
    test_x, test_y = dataset[0]
    test_x_batch = test_x.unsqueeze(0)
    test_y_batch = test_y.unsqueeze(0)

    pred = model(test_x_batch).squeeze()
    target = test_y_batch.squeeze()

    print("\n--- Sanity check ---")
    print(f"{'idx':>4} {'dry':>10} {'target wet':>12} {'pred wet':>12} {'erro':>10}")
    for i in [0, 100, 500, 1000, 1500, 2000]:
        dry_val = test_x.squeeze()[i].item()
        tgt_val = target[i].item()
        prd_val = pred[i].item()
        err = abs(tgt_val - prd_val)
        print(f"{i:>4} {dry_val:>10.4f} {tgt_val:>12.4f} {prd_val:>12.4f} {err:>10.4f}")