# Device smoke tests

Maestro smoke flow for the most important offline path: login → quick game → arena.

Run only during final device validation:

```powershell
maestro test expo/e2e/smoke-quick-game.yaml
```

Requirements: a development APK installed, ADB device connected, and Maestro installed locally. This folder does not run in CI and no device test is executed automatically.
