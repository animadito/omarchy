# Contributing Custom Screensaver Support to Omarchy

## Overview

Add a proper `screensaver` plugin kind to Omarchy, allowing third-party screensavers like Living Worlds to integrate naturally via the idle service.

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  omarchy.idle service (Service.qml)                       │
│  - Monitors idle time                                      │
│  - Launches screensaver after timeout                       │
│  - Currently hardcoded to run omarchy-launch-screensaver   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  omarchy-launch-screensaver (system script)                 │
│  - Opens terminal                                          │
│  - Runs omarchy-screensaver                                │
│  - Currently hardcoded to run ttfx                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  omarchy-screensaver (system script)                        │
│  - PATH hack: ~/.local/bin/omarchy-screensaver            │
│  - Runs ttfx or living_worlds_screensaver                 │
└─────────────────────────────────────────────────────────────┘
```

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  omarchy.idle service (Service.qml)                        │
│  - Monitors idle time                                      │
│  - On idle: calls shell.summon("screensaver", ...)        │
│  - On activity: calls shell.dismiss("screensaver", ...)   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Screensaver Plugin (screensaver kind)                      │
│  - FullscreenOverlay with ignoresInput: true               │
│  - Service component to handle lifecycle                   │
│  - Lifecycle hooks: onShow, onHide                        │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
          ┌─────────────┐   ┌─────────────────┐
          │ Living      │   │ ttfx             │
          │ Worlds      │   │ (default)        │
          └─────────────┘   └─────────────────┘
```

## Implementation Plan

### Phase 1: Core Changes (Omarchy Shell)

#### 1.1 Add `screensaver` to plugin kinds

File: `shell/pluginservices/PluginRegistry.qml`

```qml
// Add to PluginKind enum:
Item {
    id: ScreensaverKind  // new
    // ...
}
```

#### 1.2 Modify idle service to use screensaver plugin

File: `shell/plugins/services/idle/Service.qml`

```qml
function launchScreensaver() {
    // Check if user has custom screensaver plugin
    var screensaver = shell.firstPartyServiceFor("omarchy.screensaver")
                          || shell.firstPartyServiceFor("screensaver.default");
    
    if (screensaver) {
        // New path: summon screensaver overlay
        shell.summon("screensaver");
    } else {
        // Fallback: legacy path
        runProcess(screensaverProcess, "screensaver", 
            "[[ $(omarchy-shell lock isLocked 2>/dev/null) == \"true\" ]] || omarchy-launch-screensaver");
    }
}
```

#### 1.3 Add default screensaver plugin

File: `shell/plugins/screensaver/`

```
screensaver/
├── manifest.json
├── Service.qml          # Default screensaver service
└── Overlay.qml         # FullscreenOverlay wrapper
```

### Phase 2: Plugin Contract

#### 2.1 Define screensaver plugin interface

```qml
// Service.qml for screensaver plugins
Service {
    id: root
    
    // Lifecycle methods (called by shell)
    function onShow() { }
    function onHide() { }
    function onActivity() { }
    
    // Screensaver should call this when user dismisses
    function dismiss() {
        shell.dismiss("screensaver");
    }
    
    FullscreenOverlay {
        id: overlay
        // Plugin renders here
    }
}
```

#### 2.2 Update manifest schema

```json
{
  "schemaVersion": 1,
  "id": "living-worlds.screensaver",
  "name": "Living Worlds",
  "kinds": ["screensaver"],
  "entryPoints": {
    "screensaver": "Service.qml"
  }
}
```

### Phase 3: Living Worlds Integration

#### 3.1 Update plugin manifest

```json
{
  "id": "living-worlds.screensaver",
  "kinds": ["screensaver"],
  "entryPoints": {
    "screensaver": "LivingWorlds.qml"
  }
}
```

#### 3.2 Create Living Worlds screensaver QML

```qml
import QtQuick
import Quickshell

Service {
    id: root
    name: "Living Worlds Screensaver"
    
    function onShow() {
        // Launch our binary
        Process.start("living_worlds_screensaver", ["--fullscreen"]);
    }
    
    function onHide() {
        // Kill screensaver process
        Process.kill("living_worlds_screensaver");
    }
}
```

## Files to Modify

| File | Change |
|------|--------|
| `shell/pluginservices/PluginRegistry.qml` | Add ScreensaverKind |
| `shell/plugins/services/idle/Service.qml` | Use screensaver plugin |
| `shell/plugins/screensaver/` (new) | Default screensaver |
| `shell/Shell.qml` | Add summon/dismiss for screensaver |
| `config/omarchy/shell.json` | Remove screensaver config? |

## Testing Plan

1. Unit test idle service behavior
2. Test screensaver plugin discovery
3. Test lifecycle: show → idle → activity → hide
4. Test fallback to ttfx when no screensaver plugin
5. Test Living Worlds integration

## Alternative: Service-Based Approach (Simpler)

If adding a new plugin kind is too invasive, modify idle service to:

1. Check for `omarchy.screensaver` service
2. If exists, call `startScreensaver()` / `stopScreensaver()` methods
3. Default ttfx implementation in `omarchy.idle`

```qml
function launchScreensaver() {
    var custom = shell.firstPartyServiceFor("omarchy.screensaver");
    if (custom && typeof custom.start === "function") {
        custom.start();
    } else {
        // legacy ttfx path
        runProcess(...);
    }
}
```

This is less elegant but avoids adding a new plugin kind.

## Questions for Upstream

1. Is a `screensaver` plugin kind desired?
2. Should screensavers be overlays or services?
3. Should the idle service be modified or extended?
4. What lifecycle hooks are needed?

## Timeline Estimate

- **Simple approach (service hooks)**: 1-2 PRs
- **Full approach (new plugin kind)**: 3-4 PRs with review cycles

## References

- Shell plugin system: `shell/plugins/README.md`
- Idle service: `shell/plugins/services/idle/Service.qml`
- Plugin marketplace: https://plugins.omarchy.org/
- Quickshell docs: https://quickshell.org/
