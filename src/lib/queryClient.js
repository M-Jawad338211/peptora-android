import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Single shared QueryClient — this is the React Native equivalent of the
// react-query setup we use on web. Data fetched here is cached in memory
// (and persisted to disk below), so switching tabs re-shows the last known
// data instantly instead of a loading spinner, while a background refetch
// keeps it fresh.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // data is "fresh" for 1 min — no refetch/spinner on quick tab switches
      gcTime: 24 * 60 * 60 * 1000, // keep unused cache around for a day so cold starts can hydrate from disk
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false, // not meaningful on native, avoid surprise refetches
    },
  },
});

// Persist the cache to disk so the app has something to show immediately on
// cold start (stale-while-revalidate) instead of a blank loading state.
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "peptora-query-cache",
  throttleTime: 1000,
});

export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day
