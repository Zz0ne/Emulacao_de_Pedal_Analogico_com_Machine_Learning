import torch


class ESRLoss(torch.nn.Module):
    def __init__(self, eps=1e-8):
        super().__init__()
        self.eps = eps

    def forward(self, y_pred, y_true):
        numerator = torch.sum((y_pred - y_true) ** 2)
        denominator = torch.sum(y_true ** 2) + self.eps
        return numerator / denominator