import { getAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import { GoogleCalendarClient } from "./api-client";
import { GoogleCalendar, GoogleCalendarEvent } from "./models";

export function useApiClient() {
  const [apiClient, setApiClient] = useState<GoogleCalendarClient | null>(null);

  useEffect(() => {
    const apiClient = new GoogleCalendarClient(getAccessToken().token);
    setApiClient(apiClient);
  }, []);

  return apiClient;
}

function useData<T>(dataFetcher: (apiClient: GoogleCalendarClient) => Promise<T>): T | null {
  const apiClient = useApiClient();
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    async function getData() {
      if (!apiClient) {
        return;
      }
      const fetchedData = await dataFetcher(apiClient);
      setData(fetchedData);
    }

    getData();

    return () => {
      setData(null);
    };
  }, [apiClient]);

  return data;
}

export function useCalendars(): GoogleCalendar[] | null {
  return useData(async (apiClient) => await apiClient.getCalendars());
}

export function useEvents(calendarId: string): GoogleCalendarEvent[] | null {
  return useData(async (apiClient) => await apiClient.getEvents(calendarId));
}
