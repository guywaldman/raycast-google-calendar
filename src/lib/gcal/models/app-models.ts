import { GoogleMeetConference } from "@/lib/gmeet/models";

export interface GoogleCalendar {
  id: string;
  name: string;
  backgroundColor?: string;
  location: string;
  description: string;
  hidden: boolean;
  timezone: string;
}

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  calendar: GoogleCalendar;
  organizer?: {
    displayName?: string;
    email?: string;
  };
  googleMeet?: {
    link: string;
  };
  attendees?: {
    displayName?: string;
    email?: string;
    responseStatus?: string;
  }[];
  conference?: GoogleMeetConference;
}

export interface GoogleCalendarEventCreationRequest {
  title: string;
  description: string;
  startTime: Date;
  durationInMinutes: number;
  calendar: GoogleCalendar;
}
