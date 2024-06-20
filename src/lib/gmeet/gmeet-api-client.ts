import { GoogleApiClient } from "../google-api";
import {
  GoogleMeetApiConferenceParticipants,
  GoogleMeetApiConferenceRecord,
  GoogleMeetConference,
  GoogleMeetConferenceParticipant,
} from "./models";

const GOOGLE_MEET_API_PARTICIPANTS_LIST = "https://meet.googleapis.com/v2/conferenceRecords/{conferenceRecordName}/participants";
const GOOGLE_MEET_API_CONFERENCE_RECORD = "https://meet.googleapis.com/v2/conferenceRecords/{conferenceId}";

/** A client for interacting with the Google Meet API. */
export class GoogleMeetClient extends GoogleApiClient {
  constructor(protected token: string) {
    super(token);
  }

  async getConferenceData(conferenceId: string): Promise<GoogleMeetConference> {
    try {
      const resp = await this.getFromGoogleRestApi("https://meet.googleapis.com/v2/conferenceRecords");
      console.log({ resp });
      // console.log(`Getting conference data for ${conferenceId}`);
      // const conferenceRecord = await this.getConferenceRecord(conferenceId);
      // console.log({ conferenceRecord });
      // if (!conferenceRecord.name) {
      //   throw new Error(`Failed to get conference data for ${conferenceId}`);
      // }

      // console.log(`Got conference record for ${conferenceId} (ID: ${conferenceRecord.name})`);
      const response = await this.getFromGoogleRestApi<GoogleMeetApiConferenceParticipants>(
        GOOGLE_MEET_API_PARTICIPANTS_LIST.replace("{conferenceRecordName}", conferenceId),
      );
      console.log({ response });
      const participants = response.participants.map(
        (participant) =>
          ({
            name: participant.name,
            joinTime: participant.earliestStartTime,
            leaveTime: participant.latestEndTime,
          }) satisfies GoogleMeetConferenceParticipant,
      );
      return {
        id: conferenceId,
        participants,
      };
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to get conference data for ${conferenceId}`);
    }
  }

  // private async getConferenceRecord(conferenceId: string): Promise<GoogleMeetApiConferenceRecord> {
  //   const resp = await this.getFromGoogleRestApi("https://meet.googleapis.com/v2/conferenceRecords");
  //   console.log({ resp });
  //   const url = GOOGLE_MEET_API_CONFERENCE_RECORD.replace("{conferenceId}", conferenceId);
  //   const response = await this.getFromGoogleRestApi<GoogleMeetApiConferenceRecord>(url);
  //   return response;
  // }
}
