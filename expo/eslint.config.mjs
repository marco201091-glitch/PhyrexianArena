import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';

export default defineConfig([
  expoConfig,
  {
    ignores: [
      '**/node_modules/**',
      '.expo/**',
      '.qa-*/**',
      'android/**',
      'ios/**',
      'coverage/**',
    ],
  },
  {
    rules: {
      // Existing state synchronization patterns are intentionally shared with web.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
    },
  },
]);
