import random

import torch
import torchaudio
from torch.utils.data import Dataset, Subset


class AudioPairDataset(Dataset):
    def __init__(self, dry_path, wet_path, window_size, start=0, end=None):
        dry, sr_dry = torchaudio.load(dry_path)
        wet, sr_wet = torchaudio.load(wet_path)

        assert sr_dry == sr_wet, "Sample rates não coincidem"
        assert dry.shape == wet.shape, "Dry e wet têm shapes diferentes"

        dry = dry.squeeze(0)
        wet = wet.squeeze(0)

        if end is None:
            end = dry.shape[0]

        self.dry = dry[start:end]
        self.wet = wet[start:end]
        self.window_size = window_size
        self.n_windows = self.dry.shape[0] // window_size

    def __len__(self):
        return self.n_windows

    def __getitem__(self, idx):
        s = idx * self.window_size
        e = s + self.window_size
        x = self.dry[s:e].unsqueeze(-1)
        y = self.wet[s:e].unsqueeze(-1)
        return x, y


def split_dataset_random(dataset, val_ratio=0.2, seed=42):
    """Divide um Dataset em treino/validação por janelas aleatórias."""
    n = len(dataset)
    indices = list(range(n))

    rng = random.Random(seed)
    rng.shuffle(indices)

    split = int(n * (1 - val_ratio))
    train_indices = indices[:split]
    val_indices = indices[split:]

    return Subset(dataset, train_indices), Subset(dataset, val_indices)