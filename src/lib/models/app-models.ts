import { GoogleCalendarListApiItemResponse } from "./api-models";

export type GoogleCalendar = GoogleCalendarListApiItemResponse;

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string;
}
