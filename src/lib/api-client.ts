import fetch from "node-fetch";
import {
  GoogleCalendar,
  GoogleCalendarEvent,
  GoogleCalendarEventListApiResponse,
  GoogleCalendarListApiItemResponse,
  GoogleCalendarListApiResponse,
} from "./models";

// https://developers.google.com/calendar/api/v3/reference/calendarList/list
const API_LIST_CALENDARS_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList?showHidden=true";

// https://developers.google.com/calendar/api/v3/reference/events/list
const API_LIST_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events";

export function getEventListApiEndpoint(calendarId: string, maxTimeAgoInDays: number = 14) {
  let endpoint = API_LIST_EVENTS_URL.replace("{calendarId}", calendarId);
  if (maxTimeAgoInDays && maxTimeAgoInDays > 0) {
    endpoint += `?timeMin=${new Date().toISOString()}&maxResults=${maxTimeAgoInDays}`;
  }
  return endpoint;
}

export class GoogleCalendarClient {
  constructor(private token: string) {}

  async getCalendars(): Promise<GoogleCalendar[]> {
    const calendarsResponse =
      await this.getFromGoogleCalendarApi<GoogleCalendarListApiResponse>(API_LIST_CALENDARS_URL);
    return calendarsResponse.items;
  }

  async getEvents(calendarId: string): Promise<GoogleCalendarEvent[]> {
    const eventsResponse = await this.getFromGoogleCalendarApi<GoogleCalendarEventListApiResponse>(
      getEventListApiEndpoint(calendarId),
    );
    return eventsResponse.items.map((event) => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
    }));
  }

  private async getFromGoogleCalendarApi<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    const parsedResponse = await response.json();
    return parsedResponse as T;
  }
}
