import json
import torch
from model import LSTMEmulator

HIDDEN_SIZE = 8

model = LSTMEmulator(hidden_size=HIDDEN_SIZE)
model.load_state_dict(torch.load("model/model_weights.pt", weights_only=True))
model.eval()

state_dict = model.state_dict()

print("Chaves no state_dict:")
for key, tensor in state_dict.items():
    print(f"  {key:30s} shape={tuple(tensor.shape)}")

# Construir um dict serializável em JSON
exported = {
    "model_data": {
        "hidden_size": HIDDEN_SIZE,
        "input_size": 1,
        "output_size": 1,
        "unit_type": "LSTM",
    },
    "state_dict": {
        key: tensor.cpu().numpy().tolist()
        for key, tensor in state_dict.items()
    },
}

with open("model/model.json", "w") as f:
    json.dump(exported, f, indent=2)

print("\nExportado para model/model.json")