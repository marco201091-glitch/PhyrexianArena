import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'artifacts/**',
      'expo/.expo/**',
      'expo/dist/**',
      'expo/web-build/**',
      'mobile/android/**',
    ],
  },
  ...nextVitals,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: [
      'expo/components/live-game/table-arena.tsx',
      'expo/components/live-game/table-seat.tsx',
    ],
    rules: {
      // Reanimated SharedValue.value is intentionally mutable in UI/event callbacks.
      'react-hooks/immutability': 'off',
    },
  },
];

export default eslintConfig;
