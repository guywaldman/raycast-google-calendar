import { getAccessToken, useCachedPromise, useCachedState, useLocalStorage } from "@raycast/utils";
import { useEffect } from "react";
import { GoogleCalendarClient } from "./api-client";
import { DefaultConfig, ExtensionConfig } from "./config";

interface CacheItem<T> {
  lastUpdated: Date;
  data: T;
}

export function useCache<T>(cacheKey: string, fetcher: () => Promise<T | null>) {
  const { data, isLoading, mutate, revalidate } = useCachedPromise(fetcher);

  // useEffect(() => {
  //   if (data?.data && data?.lastUpdated) {
  //     // Data exists - check if it needs to be updated.
  //     if (new Date().getTime() - data.lastUpdated.getTime() > options?.updateIntervalInMinutes * 60 * 1000) {
  //       setData(null);
  //     }
  //   } else {
  //     // No data - fetch it.
  //     fetcher()
  //       .then((fetchedData) => {
  //         if (fetchedData) {
  //           setData({ lastUpdated: new Date(), data: fetchedData });
  //         }
  //       })
  //       .catch((err) => {
  //         console.error(err);
  //       });
  //   }
  // }, [cacheKey]);

  // return data ? data.data : null;
  return { data, isLoading, mutate, revalidate };
}

export function useConfig(): {
  value: ExtensionConfig | undefined;
  setValue: (config: ExtensionConfig) => Promise<void>;
  isLoading: boolean;
} {
  const { value, setValue, isLoading } = useLocalStorage("config", DefaultConfig);

  // const updateConfig = useCallback((newConfigState: ExtensionConfig) => {
  //   return setConfig(newConfigState).then(() => {
  //     setConfigState(newConfigState);
  //   });
  // }, []);

  // useEffect(() => {
  //   getConfig()
  //     .then((newConfigState) => {
  //       if (newConfigState) {
  //         setConfigState(newConfigState);
  //       }
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //       setConfigState(DefaultConfig);
  //     });
  // }, []);

  return { value, setValue, isLoading };
}

export function useCalendars() {
  const apiClient = new GoogleCalendarClient(getAccessToken().token);
  return useCache("calendars", async () => await apiClient.getCalendars());
}

export function useUpcomingEvents() {
  const apiClient = new GoogleCalendarClient(getAccessToken().token);
  return useCache("upcoming-events", async () => {
    const calendars = await apiClient.getCalendars();
    const allEvents = await Promise.all(calendars.map((cal) => apiClient.getUpcomingEvents(cal)));
    const events = allEvents.flat();
    events.sort((a, b) => {
      if (a.startTime !== b.startTime) {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      } else {
        return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
      }
    });
    return events;
  });
}
