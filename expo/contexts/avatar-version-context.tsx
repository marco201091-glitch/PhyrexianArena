import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

type AvatarVersionContextValue = {
  version: number;
  bumpAvatarVersion: () => void;
};

const AvatarVersionContext = createContext<AvatarVersionContextValue | null>(null);

export function AvatarVersionProvider({ children }: PropsWithChildren) {
  const [version, setVersion] = useState(0);
  const bumpAvatarVersion = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  const value = useMemo(
    () => ({ version, bumpAvatarVersion }),
    [bumpAvatarVersion, version],
  );

  return (
    <AvatarVersionContext.Provider value={value}>
      {children}
    </AvatarVersionContext.Provider>
  );
}

export function useAvatarVersion() {
  const context = useContext(AvatarVersionContext);
  if (!context) {
    throw new Error('useAvatarVersion must be used within AvatarVersionProvider');
  }
  return context;
}