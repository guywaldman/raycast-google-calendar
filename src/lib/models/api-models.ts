export interface GoogleCalendarListApiItemResponse {
  kind: "calendar#calendarListEntry";
  etag: string;
  id: string;
  summary: string;
  description: string;
  location: string;
  timeZone: string;
  summaryOverride: string;
  colorId: string;
  backgroundColor: string;
  foregroundColor: string;
  hidden: boolean;
  selected: boolean;
  accessRole: string;
  defaultReminders: {
    method: string;
    minutes: number;
  }[];
  notificationSettings: {
    notifications: {
      type: string;
      method: string;
    }[];
  };
  primary: boolean;
  deleted: boolean;
  conferenceProperties: {
    allowedConferenceSolutionTypes: string[];
  };
}

export interface GoogleCalendarListApiResponse {
  items: GoogleCalendarListApiItemResponse[];
}

export interface GoogleCalendarEventListApiResponse {
  kind: string;
  items: GoogleCalendarEventListApiItemResponse[];
}

export interface GoogleCalendarEventListApiItemResponse {
  id: string;
  summary: string;
  description: string;
}
