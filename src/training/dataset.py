import torchaudio
from torch.utils.data import Dataset

WINDOW_SIZE = 2048

class AudioPairDataset(Dataset):
    def __init__(self, dry_path, wet_path, window_size, start=0, end=None):
        print(">>> A executar __init__ com start=", start, "end=", end)
        dry, sr_dry = torchaudio.load(dry_path)
        wet, sr_wet = torchaudio.load(wet_path)

        print(">>> dry após load:", dry.shape)

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