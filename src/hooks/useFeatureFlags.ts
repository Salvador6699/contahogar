import { useCallback, useEffect, useState } from 'react';
import {
  FEATURE_FLAGS_CHANGED_EVENT,
  FeatureFlagKey,
  FeatureFlagsState,
  readFeatureFlags,
  resetFeatureFlags,
  setFeatureFlag,
} from '@/lib/featureFlags';

/**
 * Reactive hook for reading and toggling experimental feature flags stored in localStorage.
 */
export const useFeatureFlags = () => {
  const [flags, setFlags] = useState<FeatureFlagsState>(() => readFeatureFlags());

  useEffect(() => {
    const sync = () => setFlags(readFeatureFlags());
    window.addEventListener(FEATURE_FLAGS_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FEATURE_FLAGS_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggleFlag = useCallback((key: FeatureFlagKey, value?: boolean) => {
    const current = readFeatureFlags();
    const nextVal = typeof value === 'boolean' ? value : !current[key];
    setFlags(setFeatureFlag(key, nextVal));
  }, []);

  const resetAll = useCallback(() => {
    setFlags(resetFeatureFlags());
  }, []);

  return { flags, toggleFlag, resetAll };
};
