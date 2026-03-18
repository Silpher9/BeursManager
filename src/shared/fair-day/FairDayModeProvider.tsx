import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type ActiveFairDayState = {
  fairId: string;
  fairName: string;
};

type FairDayModeContextValue = {
  activeFair: ActiveFairDayState | null;
  activateFairDay: (fairId: string, fairName: string) => void;
  deactivateFairDay: () => void;
  isFairDayActiveFor: (fairId?: string | null) => boolean;
};

const FairDayModeContext = createContext<FairDayModeContextValue | null>(null);

export function FairDayModeProvider({ children }: { children: ReactNode }) {
  const [activeFair, setActiveFair] = useState<ActiveFairDayState | null>(null);

  const value = useMemo<FairDayModeContextValue>(
    () => ({
      activeFair,
      activateFairDay: (fairId, fairName) => {
        setActiveFair({ fairId, fairName });
      },
      deactivateFairDay: () => {
        setActiveFair(null);
      },
      isFairDayActiveFor: (fairId) => Boolean(fairId && activeFair?.fairId === fairId),
    }),
    [activeFair]
  );

  return <FairDayModeContext.Provider value={value}>{children}</FairDayModeContext.Provider>;
}

export function useFairDayMode() {
  const context = useContext(FairDayModeContext);

  if (!context) {
    throw new Error('useFairDayMode must be used within FairDayModeProvider.');
  }

  return context;
}
