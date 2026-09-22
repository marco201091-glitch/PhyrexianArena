# Device smoke tests

Maestro smoke flow for the most important offline path: login → quick game → arena.

Run only during final device validation:

```powershell
npm run test:e2e:android
```

Requirements: a development APK installed, an unlocked ADB device connected, and Maestro installed locally. This folder does not run in CI and no device test is executed automatically.
