import torchaudio
from torch.utils.data import Dataset

WINDOW_SIZE = 2048

class AudioPairDataset(Dataset):
    def __init__(self, dry_path, wet_path, window_size):
        dry, sr_dry = torchaudio.load(dry_path)
        wet, sr_wet = torchaudio.load(wet_path)

        assert sr_dry == sr_wet, "Sample rates não coincidem"
        assert dry.shape == wet.shape, "Dry e wet têm shapes diferentes"

        self.dry = dry.squeeze(0)
        self.wet = wet.squeeze(0)
        self.window_size = window_size
        self.n_windows = self.dry.shape[0] // window_size

    def __len__(self):
        return self.n_windows

    def __getitem__(self, idx):
        start = idx * self.window_size
        end = start + self.window_size
        x = self.dry[start:end].unsqueeze(-1)
        y = self.wet[start:end].unsqueeze(-1)
        return x, y