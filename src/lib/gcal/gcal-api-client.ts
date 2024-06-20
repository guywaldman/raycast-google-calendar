import { formatISO } from "date-fns/formatISO";
import fetch from "node-fetch";
import {
  GoogleCalendar,
  GoogleCalendarApiCreateEventRequest,
  GoogleCalendarEvent,
  GoogleCalendarEventCreationRequest,
  GoogleCalendarEventListApiResponse,
  GoogleCalendarListApiResponse,
  GoogleCalendarTask,
  GoogleCalendarTaskList,
  GoogleCalendarTaskListApiResponse,
  GoogleCalendarTasksApiResponse,
} from "@/lib/gcal/models";

// https://developers.google.com/calendar/api/v3/reference/calendarList/list
const API_LIST_CALENDARS_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList?showHidden=true";

// https://developers.google.com/calendar/api/v3/reference/events/list
const API_LIST_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?singleEvents=true";

// https://developers.google.com/calendar/api/v3/reference/events/insert
const API_CREATE_EVENT_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events";

// https://developers.google.com/calendar/api/v3/reference/events/delete
const API_DELETE_EVENT_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}";

// https://developers.google.com/tasks/reference/rest/v1/tasklists/list
const API_LIST_TASK_LISTS_URL = "https://www.googleapis.com/tasks/v1/users/@me/lists";

// https://developers.google.com/tasks/reference/rest/v1/tasks/list
const API_LIST_TASKS_URL = "https://tasks.googleapis.com/tasks/v1/lists/{tasklist}/tasks";

export function getEventListApiEndpoint(calendarId: string, minTimeInHours: number = 24 * 7, maxTimeInHours: number = 0) {
  let endpoint = API_LIST_EVENTS_URL.replace("{calendarId}", calendarId);
  const now = new Date();
  const minTime = now.getTime() - minTimeInHours * 60 * 60 * 1000;
  const maxTime = now.getTime() + maxTimeInHours * 60 * 60 * 1000;
  endpoint += `&timeMin=${new Date(minTime).toISOString()}&timeMax=${new Date(maxTime).toISOString()}`;
  return endpoint;
}

/** A client for interacting with the Google Calendar API. */
export class GoogleCalendarClient {
  constructor(private token: string) {}

  async getCalendars(): Promise<GoogleCalendar[]> {
    const calendarsResponse = await this.getFromGoogleCalendarApi<GoogleCalendarListApiResponse>(API_LIST_CALENDARS_URL);
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
    const eventsResponse = await this.getFromGoogleCalendarApi<GoogleCalendarEventListApiResponse>(
      getEventListApiEndpoint(calendar.id, minTimeInHours, maxTimeInHours) + "&conferenceDataVersion=1",
    );
    // @ts-expect-error Error is not typed correctly.
    if (eventsResponse.error) {
      return [];
    }

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
    } satisfies GoogleCalendarApiCreateEventRequest;
    const url = API_CREATE_EVENT_URL.replace("{calendarId}", event.calendar.id);
    await this.postToGoogleCalendarApi<GoogleCalendarApiCreateEventRequest>(url, requestBody);
  }

  /** Deletes the given event for the given calendar. */
  async deleteEvent(eventId: string, calendarId: string): Promise<void> {
    await this.deleteFromGoogleCalendarApi(API_DELETE_EVENT_URL.replace("{calendarId}", calendarId).replace("{eventId}", eventId));
  }

  async getAllTaskLists(): Promise<GoogleCalendarTaskList[]> {
    const response = await this.getFromGoogleCalendarApi<GoogleCalendarTaskListApiResponse>(API_LIST_TASK_LISTS_URL);
    return response.items.map((item) => ({
      id: item.id,
      title: item.title,
    }));
  }

  async getAllTasks(): Promise<GoogleCalendarTask[]> {
    const taskLists = await this.getAllTaskLists();
    const tasks = await Promise.all(taskLists.map((taskList) => this.getTasksForTaskList(taskList)));
    return tasks.flat();
  }

  async getUpcomingTasks(): Promise<GoogleCalendarTask[]> {
    const taskLists = await this.getAllTaskLists();
    const tasks = await Promise.all(taskLists.map((taskList) => this.getUpcomingTasksForTaskList(taskList)));
    return tasks.flat();
  }

  private async getUpcomingTasksForTaskList(taskList: GoogleCalendarTaskList): Promise<GoogleCalendarTask[]> {
    let url = API_LIST_TASKS_URL.replace("{tasklist}", taskList.id);
    const now = new Date();
    url += `?showCompleted=false&showDeleted=false&dueMin=${now.toISOString()}`;
    const response = await this.getFromGoogleCalendarApi<GoogleCalendarTasksApiResponse>(url);
    return response.items.map((item) => ({
      id: item.id,
      title: item.title,
      due: item.due,
      updated: item.updated,
      completed: item.completed,
      deleted: item.deleted,
      status: item.status,
      hidden: item.hidden,
    }));
  }

  private async getTasksForTaskList(taskList: GoogleCalendarTaskList): Promise<GoogleCalendarTask[]> {
    const response = await this.getFromGoogleCalendarApi<GoogleCalendarTasksApiResponse>(
      API_LIST_TASKS_URL.replace("{tasklist}", taskList.id),
    );
    return response.items.map(
      (item) =>
        ({
          id: item.id,
          title: item.title,
          due: item.due,
          updated: item.updated,
          completed: item.completed,
          deleted: item.deleted,
          status: item.status,
          hidden: item.hidden,
        }) satisfies GoogleCalendarTask,
    );
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

  private async postToGoogleCalendarApi<T>(url: string, body: T): Promise<void> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to POST to '${url}' (${response.statusText}): ${errorText}`);
    }
  }

  private async deleteFromGoogleCalendarApi(url: string): Promise<void> {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to DELETE to '${url}' (${response.statusText}): ${errorText}`);
    }
  }
}
