import { useSyncExternalStore } from 'react';

/**
 * The visitor's IANA time zone, safe to render in a page built ahead of time.
 *
 * The site is built on GitHub's servers, which run in UTC. Reading the zone
 * during render baked "UTC" into the static HTML, so every visitor in another
 * zone hit a hydration mismatch (React error #418) and React re-rendered the
 * whole widget. useSyncExternalStore renders the server value for the build and
 * for the first browser render, then switches to the real zone without a
 * mismatch.
 */
const SERVER_LABEL = 'Local time';

const subscribe = () => () => {};

const readZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || SERVER_LABEL;
  } catch {
    return SERVER_LABEL;
  }
};

/** For labels only. Pass a real zone to formatting code, never this placeholder. */
export const useLocalZone = (): string => useSyncExternalStore(subscribe, readZone, () => SERVER_LABEL);
