import {
  GoogleCalendar,
  GoogleCalendarEvent,
  GoogleCalendarEventCreationRequest,
  GoogleCalendarEventListApiResponse,
  GoogleCalendarListApiResponse,
} from "@/lib/gcal/models";
import { formatISO } from "date-fns/formatISO";
import { GoogleApiClient } from "../google-api";
import { GoogleMeetClient } from "../gmeet";

// https://developers.google.com/calendar/api/v3/reference/calendarList/list
const API_LIST_CALENDARS_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList?showHidden=true";

// https://developers.google.com/calendar/api/v3/reference/events/list
const API_LIST_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?singleEvents=true";

// https://developers.google.com/calendar/api/v3/reference/events/insert
const API_CREATE_EVENT_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events";

// https://developers.google.com/calendar/api/v3/reference/events/delete
const API_DELETE_EVENT_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}";

export function getEventListApiEndpoint(calendarId: string, minTimeInHours: number = 24 * 7, maxTimeInHours: number = 0) {
  let endpoint = API_LIST_EVENTS_URL.replace("{calendarId}", calendarId);
  const now = new Date();
  const minTime = now.getTime() - minTimeInHours * 60 * 60 * 1000;
  const maxTime = now.getTime() + maxTimeInHours * 60 * 60 * 1000;
  endpoint += `&timeMin=${new Date(minTime).toISOString()}&timeMax=${new Date(maxTime).toISOString()}`;
  return endpoint;
}

/** A client for interacting with the Google Calendar API. */
export class GoogleCalendarClient extends GoogleApiClient {
  private readonly googleMeetClient: GoogleMeetClient;

  constructor(protected token: string) {
    super(token);
    this.googleMeetClient = new GoogleMeetClient(token);
  }

  async getCalendars(): Promise<GoogleCalendar[]> {
    const calendarsResponse = await this.getFromGoogleRestApi<GoogleCalendarListApiResponse>(API_LIST_CALENDARS_URL);
    return calendarsResponse.items.map((item) => ({
      id: item.id!,
      name: item.summary!,
      backgroundColor: item.colorId,
      hidden: item.hidden ?? false,
      location: item.location!,
      description: item.description!,
      timezone: item.timeZone!,
    }));
  }

  /** Returns the events for the given calendar, between the given time range. */
  async getEvents(calendar: GoogleCalendar, minTimeInHours?: number, maxTimeInHours?: number): Promise<GoogleCalendarEvent[]> {
    const eventsResponse = await this.getFromGoogleRestApi<GoogleCalendarEventListApiResponse>(
      getEventListApiEndpoint(calendar.id, minTimeInHours, maxTimeInHours) + "&conferenceDataVersion=1",
    );
    // @ts-ignore
    if (eventsResponse.error) {
      return [];
    }

    const conferenceIds = eventsResponse.items.map((item) => item.conferenceData?.conferenceId).filter(Boolean);
    const conferences = await Promise.all(conferenceIds.map((id) => this.googleMeetClient.getConferenceData(id!)));

    const events = eventsResponse.items.map((item) => {
      return {
        id: item.id!,
        title: item.summary!,
        description: item.description!,
        startTime: item.start!.date! ?? item.start!.dateTime!,
        endTime: item.end!.date! ?? item.end!.dateTime!,
        calendar,
        organizer: item.organizer,
        googleMeet: item.hangoutLink
          ? {
              link: item.hangoutLink,
            }
          : undefined,
        attendees: item.attendees?.map((attendee) => ({
          displayName: attendee.displayName,
          email: attendee.email,
          responseStatus: attendee.responseStatus,
        })),
        conference: conferences.find((c) => c.id === item.conferenceData?.conferenceId),
      } satisfies GoogleCalendarEvent;
    });
    return events;
  }

  /** Returns the upcoming events for the given calendar. */
  async getUpcomingEvents(calendar: GoogleCalendar): Promise<GoogleCalendarEvent[]> {
    const events = await this.getEvents(calendar, 0, 24 * 7);
    return events;
  }

  /** Creates a new event for the given calendar. */
  async createEvent(event: GoogleCalendarEventCreationRequest): Promise<void> {
    const endTime = event.startTime.getTime() + event.durationInMinutes * 60 * 1000;

    const requestBody = {
      summary: event.title,
      start: {
        dateTime: formatISO(event.startTime),
        timeZone: event.calendar.timezone,
      },
      end: {
        dateTime: formatISO(endTime),
        timeZone: event.calendar.timezone,
      },
      description: event.description,
    };
    await this.postToGoogleRestApi<any>(API_CREATE_EVENT_URL.replace("{calendarId}", event.calendar.id), requestBody);
  }

  /** Deletes the given event for the given calendar. */
  async deleteEvent(eventId: string, calendarId: string): Promise<void> {
    await this.deleteFromGoogleRestApi(API_DELETE_EVENT_URL.replace("{calendarId}", calendarId).replace("{eventId}", eventId));
  }
}
