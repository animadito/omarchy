# Living Worlds Screensaver Plugin

Mark Ferrari's color-cycling pixel art screensaver for Omarchy.

## Features

- 22 unique scenes with smooth color cycling animation
- Time of Day palette interpolation (dawn/day/dusk/night)
- Seasonal scene matching
- GPU-accelerated via SDL2
- Frame-rate independent animation

## Installation

### 1. Install Plugin

```bash
omarchy plugin add https://github.com/your-user/living-worlds
```

### 2. Obtain Scene Data

The plugin does not include LucasArts' copyrighted artwork. You must have a legitimate copy of Living Worlds.

**Option A: From Original CD**
```bash
# Extract scenes from your Living Worlds CD/archive
python3 ~/.config/omarchy/plugins/living-worlds/tools/convert_scenes.py /path/to/living-worlds ~/.local/share/living-worlds/scenes
```

**Option B: From Archive.org**
1. Download LucasArts Living Worlds from archive.org
2. Extract and convert

### 3. Enable

The plugin activates automatically when you reach idle timeout (configured in `~/.config/omarchy/shell.json`).

## Configuration

### Idle Timeout

Edit `~/.config/omarchy/shell.json`:
```json
{
  "idle": {
    "screensaver": 150,
    "lock": 300
  }
}
```

### CLI Options

```bash
# Default: random scenes, VSync on
omarchy-screensaver

# Seasonal mode (match current month)
omarchy-screensaver --seasonal

# Specific scene
omarchy-screensaver --scene V05

# Manual time of day
omarchy-screensaver --tod night

# Pixel-perfect scaling
omarchy-screensaver --pixel-perfect

# No VSync
omarchy-screensaver --no-vsync
```

## Manual Installation (without plugin)

```bash
# Clone the engine
git clone https://github.com/your-user/living-worlds-engine
cd living-worlds-engine/screensaver-c

# Build
make

# Install binary
install -Dm755 living_worlds_screensaver ~/.local/bin/

# Install override script
ln -sf ~/.config/omarchy/plugins/living-worlds/bin/omarchy-screensaver ~/.local/bin/
```

## Troubleshooting

### "Scene data not found"
```bash
ls ~/.local/share/living-worlds/scenes/
# Should show manifest.json and .bin files
```

### Screensaver doesn't start
```bash
# Check if override is working
which omarchy-screensaver
# Should show ~/.local/bin/omarchy-screensaver
```

### Low FPS
```bash
# Try with VSync off
omarchy-screensaver --no-vsync
```

## Credits

**Living Worlds** was created by Mark Ferrari and published by LucasArts Entertainment (1998).

This plugin is MIT licensed. Scene data files are proprietary LucasArts content.

## License

MIT License - see LICENSE file.
