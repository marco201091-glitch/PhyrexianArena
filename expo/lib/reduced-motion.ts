import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  loadAccessibilityPreferences,
  subscribeAccessibilityPreferences,
} from '@/lib/accessibility-preferences';

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    let appPreference = false;
    let systemPreference = false;

    const update = () => {
      if (mounted) setReducedMotion(appPreference || systemPreference);
    };

    void Promise.all([
      AccessibilityInfo.isReduceMotionEnabled(),
      loadAccessibilityPreferences(),
    ])
      .then(([systemEnabled, preferences]) => {
        systemPreference = systemEnabled;
        appPreference = preferences.reducedMotion;
        update();
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      systemPreference = enabled;
      update();
    });
    const unsubscribePreferences = subscribeAccessibilityPreferences((preferences) => {
      appPreference = preferences.reducedMotion;
      update();
    });
    return () => {
      mounted = false;
      subscription.remove();
      unsubscribePreferences();
    };
  }, []);

  return reducedMotion;
}
