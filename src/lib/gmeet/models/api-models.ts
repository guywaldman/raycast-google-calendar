// https://developers.google.com/meet/api/reference/rest/v2

// https://developers.google.com/meet/api/reference/rest/v2/conferenceRecords/get
// https://developers.google.com/meet/api/reference/rest/v2/conferenceRecords#ConferenceRecord
export interface GoogleMeetApiConferenceRecord {
  name: string;
  startTime: string;
  endTime: string;
  expireTime: string;
  space: string;
}

export interface GoogleMeetApiConferenceParticipants {
  participants: GoogleMeetApiConferenceParticipant[];
}

// https://developers.google.com/meet/api/reference/rest/v2/conferenceRecords.participants#Participant
export interface GoogleMeetApiConferenceParticipant {
  name: string;
  earliestStartTime: string;
  latestEndTime: string;
}
