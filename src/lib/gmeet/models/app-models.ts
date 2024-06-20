export interface GoogleMeetConference {
  id: string;
  participants: GoogleMeetConferenceParticipant[];
}

export interface GoogleMeetConferenceParticipant {
  name: string;
  joinTime: string;
  leaveTime: string;
}
