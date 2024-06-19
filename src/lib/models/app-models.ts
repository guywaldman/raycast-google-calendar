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
  organizerDisplayName?: string;
  hasGoogleMeet: boolean;
}

export interface GoogleCalendarEventCreationRequest {
  title: string;
  description: string;
  startTime: Date;
  durationInMinutes: number;
  calendar: GoogleCalendar;
}
