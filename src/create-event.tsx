import { Action, ActionPanel, Form, Toast, popToRoot, showToast } from "@raycast/api";
import { getAccessToken, withAccessToken } from "@raycast/utils";
import { useCalendars, useConfig } from "./lib/hooks";
import { RaycastGoogleOAuthService } from "./lib/raycast/google-oauth-service";
import { useMemo, useState } from "react";
import { GoogleCalendarClient } from "./lib/api-client";

const DefaultDurationValues = [15, 30, 45, 60, 90, 120];

interface FormValues {
  eventTitle: string;
  eventDescription: string;
  eventStart: Date;
  eventDuration: number;
  calendarId: string;
}

function Command() {
  const { value: config, setValue: updateConfig, isLoading: isConfigLoading } = useConfig();
  const { data: calendars, isLoading: isCalendarsLoading } = useCalendars();
  const [durationValues, setDurationValues] = useState(DefaultDurationValues);

  const sortedCalendars = useMemo(() => {
    if (!calendars || !config) {
      return null;
    }
    const sortedCalendars = calendars.sort((a, b) => {
      const aHidden = config?.calendarConfiguration?.[a.id]?.hidden;
      const bHidden = config?.calendarConfiguration?.[b.id]?.hidden;

      if (aHidden && !bHidden) {
        return 1;
      } else if (!aHidden && bHidden) {
        return -1;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    return sortedCalendars;
  }, [calendars, config]);

  const isLoading = isCalendarsLoading || isConfigLoading;

  return (
    <Form
      isLoading={isLoading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values: FormValues) => {
              const apiClient = new GoogleCalendarClient(getAccessToken().token);
              await apiClient.createEvent({
                title: values.eventTitle,
                description: values.eventDescription,
                durationInMinutes: values.eventDuration,
                startTime: values.eventStart,
                calendar: sortedCalendars![0],
              });
              await showToast({
                title: "Event created",
                style: Toast.Style.Success,
              });
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      {sortedCalendars && config && (
        <>
          <Form.TextField id="eventTitle" title="Event Title" />
          <Form.TextArea id="eventDescription" title="Event Description" />
          <Form.DatePicker id="eventStart" title="Event Time" />
          <Form.Dropdown
            id="eventDuration"
            title="Event Duration"
            placeholder="Enter time expression such as '30m' or '2h'"
            onSearchTextChange={(searchText) => {
              const groups = searchText.match(/^(\d+)([mh])$/);
              if (groups) {
                const duration = parseInt(groups[1]);
                const unit = groups[2];
                let minutes = 0;
                if (unit === "m") {
                  minutes = duration;
                } else if (unit === "h") {
                  minutes = duration * 60;
                }
                if (minutes) {
                  if (durationValues.includes(minutes)) {
                    // Item exists - move to top of list.
                    const matchingIndex = durationValues.indexOf(minutes);
                    setDurationValues([
                      minutes,
                      ...durationValues.slice(0, matchingIndex),
                      ...durationValues.slice(matchingIndex + 1),
                    ]);
                  } else {
                    // Item does not exist - add to top of list.
                    setDurationValues([minutes, ...durationValues]);
                  }
                }
              } else {
                setDurationValues(DefaultDurationValues);
              }
            }}
          >
            {durationValues.map((duration) => {
              const formattedDuration = duration > 60 ? `${Math.floor(duration / 60)} hours` : `${duration} minutes`;
              return <Form.Dropdown.Item key={duration} title={formattedDuration} value={duration.toString()} />;
            })}
          </Form.Dropdown>
          <Form.Dropdown id="calendarId" title="Calendar" defaultValue={sortedCalendars![0].id}>
            {calendars?.map((calendar) => (
              <Form.Dropdown.Item key={calendar.id} title={calendar.name} value={calendar.id} />
            ))}
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}

export default withAccessToken({ authorize: RaycastGoogleOAuthService.authorize })(Command);
