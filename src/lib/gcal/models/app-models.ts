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
}

export interface GoogleCalendarEventCreationRequest {
  title: string;
  description: string;
  startTime: Date;
  durationInMinutes: number;
  calendar: GoogleCalendar;
}

export interface GoogleCalendarTaskList {
  id: string;
  title: string;
}

export interface GoogleCalendarTask {
  id: string;
  title: string;
  status: string;
  due: string;
  updated: string;
  completed: string;
  deleted: boolean;
  hidden: boolean;
}
