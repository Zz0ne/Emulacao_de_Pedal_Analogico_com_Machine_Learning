import torch

HIDDEN_SIZE = 8

class LSTMEmulator(torch.nn.Module):
    def __init__(self, hidden_size):
        super().__init__()
        self.hidden_size = hidden_size
        self.lstm = torch.nn.LSTM(
            input_size=1,
            hidden_size=hidden_size,
            num_layers=1,
            batch_first=True,
        )
        self.linear = torch.nn.Linear(in_features=hidden_size, out_features=1)

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        y = self.linear(lstm_out)
        return y