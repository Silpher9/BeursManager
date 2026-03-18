import { type DependencyList, useEffect } from 'react';

/**
 * useEffect wrapper for async operations with automatic isMounted cleanup.
 * The callback receives an `isMounted` function to guard state updates
 * after unmount, replacing the manual `let isMounted = true` boilerplate.
 */
export function useAsyncEffect(
  effect: (isMounted: () => boolean) => Promise<void>,
  deps: DependencyList
): void {
  useEffect(() => {
    let mounted = true;
    effect(() => mounted);
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
