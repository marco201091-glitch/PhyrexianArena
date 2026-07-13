'use client';

import { useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/capacitor';

export function useIsNativeApp() {
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  return native;
}