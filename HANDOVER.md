# Handover: Living Worlds Screensaver → Omarchy Integration

## What We've Done

### 1. Living Worlds Screensaver Engine (Complete ✅)
- **Location:** `/home/animadito/Work/Mark_Ferrari/screensaver-c/`
- **MIT Licensed** C/SDL2 implementation
- **Features:** Color cycling animation, TOD palettes, seasonal matching, 22 scenes
- **Binary:** `living_worlds_screensaver` (precompiled for Linux x86_64)

### 2. Working Plugin (Local Only ✅)
- **Location:** `~/.config/omarchy/plugins/living-worlds/`
- Uses **PATH override hack** to intercept `omarchy-screensaver`
- Works today but NOT a proper plugin integration

### 3. Omarchy Fork with Proposal (This Repo)
- **Branch:** `feature/custom-screensaver-plugins`
- **Proposal:** `docs/proposals/001-custom-screensaver-plugins.md`
- **Example:** `docs/examples/living-worlds-plugin/README.md`

## The Problem

Omarchy has no `screensaver` plugin kind. Current screensaver architecture:
1. `omarchy.idle` service monitors idle
2. When idle → calls `omarchy-launch-screensaver`
3. Which runs `ttfx` (the default screensaver)

Third-party screensavers must use PATH hacks or CLI override scripts.

## What Needs To Be Done

### Option A: Submit Proposal First (Recommended Start)
1. Read `docs/proposals/001-custom-screensaver-plugins.md`
2. Refine the proposal
3. Post to Omarchy Discussions as a feature request
4. Gauge upstream interest before implementing

### Option B: Implement Service Hook (Simpler Approach)
Modify `shell/plugins/services/idle/Service.qml` to:
1. Check for a `omarchy.screensaver` service
2. If exists, call `start()`/`stop()` methods
3. Default implementation uses existing `ttfx` path

This is less invasive than adding a new plugin kind.

### Option C: Full Plugin Kind (Most Proper)
1. Add `screensaver` to plugin registry
2. Modify idle service to use `shell.summon("screensaver")`
3. Create default screensaver plugin
4. Living Worlds implements the screensaver plugin interface

## Related Files to Reference

| File | Purpose |
|------|---------|
| `shell/plugins/services/idle/Service.qml` | Idle service - needs modification |
| `shell/plugins/README.md` | Plugin system docs |
| `shell/AGENTS.md` | Contribution guidelines |
| `/home/animadito/Work/Mark_Ferrari/docs/OMARCHY_SCREENSAVER_CONTRIBUTION.md` | Copy of proposal |

## Living Worlds Binary Location

```
/home/animadito/Work/Mark_Ferrari/screensaver-c/living_worlds_screensaver
~/.config/omarchy/plugins/living-worlds/bin/living_worlds_screensaver
```

## Questions to Answer with Upstream

1. Is a `screensaver` plugin kind desired?
2. Should screensavers be overlays or services?
3. Should idle service be modified or extended?
4. What lifecycle hooks are needed?

## Next Steps

1. Read the proposal in `docs/proposals/001-custom-screensaver-plugins.md`
2. Decide: proposal first OR implement and PR
3. If implementing: follow `shell/AGENTS.md` conventions
4. Test with `./test/all` before pushing

## Contact/Context

- User: animadito
- Feature request motivation: Living Worlds screensaver (Mark Ferrari's pixel art)
- User wants native Omarchy integration, not PATH hack
