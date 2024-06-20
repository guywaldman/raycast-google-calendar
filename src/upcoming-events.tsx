import { GoogleCalendarClient } from "@/lib/gcal/gcal-api-client";
import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { getAccessToken, withAccessToken } from "@raycast/utils";
import { format, formatDuration, intervalToDuration } from "date-fns";
import { useMemo, useState } from "react";
import { useConfig, useUpcomingEvents } from "./lib/extension/hooks";
import { GoogleCalendarEvent } from "./lib/gcal/models";
import { RaycastGoogleOAuthService } from "./lib/gcal/raycast-google-auth-service";

function Command() {
  const { data: events, isLoading: isEventsLoading, revalidate: refreshEvents } = useUpcomingEvents();
  const { value: config, isLoading: isConfigLoading } = useConfig();
  const [showDetails, setShowDetails] = useState(false);

  // Partition by today, tomorrow, etc.
  const eventsByDay = useMemo(() => {
    if (!events) {
      return null;
    }
    const filteredEvents = events.filter((event) => !config?.calendarConfiguration?.[event.calendar.id]?.disabled);
    const timeNow = new Date().getTime();
    const startOfDayNow = new Date(timeNow).setHours(0, 0, 0, 0);
    const eventsByDay = filteredEvents.reduce(
      (acc, event) => {
        const startOfDayEvent = new Date(event.startTime).setHours(0, 0, 0, 0);
        const daysFromNow = intervalToDuration({ start: startOfDayNow, end: startOfDayEvent }).days ?? 0;
        return {
          ...acc,
          [daysFromNow]: [...(acc[daysFromNow] || []), event],
        };
      },
      {} as { [day: string]: GoogleCalendarEvent[] },
    );
    const eventsByDaySorted = Object.entries(eventsByDay).sort(([ak, av], [bk, bv]) => {
      const dayA = av[0];
      const dayB = bv[0];
      return new Date(dayA.startTime).getTime() - new Date(dayB.startTime).getTime();
    });

    // Sort events in each day
    eventsByDaySorted.forEach(([_day, eventsInSection]) => {
      eventsInSection.sort((a, b) => {
        const allDayEventA = intervalToDuration({ start: a.startTime, end: a.endTime }).days! >= 1;
        const allDayEventB = intervalToDuration({ start: b.startTime, end: b.endTime }).days! >= 1;

        if (allDayEventA && !allDayEventB) {
          return 1;
        } else if (!allDayEventA && allDayEventB) {
          return -1;
        } else {
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        }
      });
    });
    return eventsByDaySorted;
  }, [events, config]);

  const isLoading = isEventsLoading || isConfigLoading;

  return (
    <List isLoading={isLoading} isShowingDetail={showDetails}>
      {config &&
        eventsByDay &&
        eventsByDay.map(([day, eventsInSection]) => {
          const dayTitle = formatDayName(parseInt(day));
          return (
            <List.Section key={dayTitle} title={dayTitle}>
              {eventsInSection?.map((event) => {
                const { id, title, startTime, endTime, organizer, calendar } = event;
                const startHour = startTime && format(startTime, "HH:mm");
                const endHour = endTime && format(endTime, "HH:mm");
                const allDayEvent = intervalToDuration({ start: startTime, end: endTime }).days! >= 1;

                const accesories: List.Item.Accessory[] = [];

                const attendees = event.attendees?.filter((attendee) => attendee.email !== organizer?.email);

                if (event.googleMeet) {
                  accesories.push({
                    icon: { source: Icon.TwoPeople, tintColor: Color.Blue },
                    text: { value: "Meeting", color: Color.Blue },
                  });
                }
                if (attendees && attendees.length > 0) {
                  accesories.push({
                    icon: { source: Icon.Person, tintColor: Color.SecondaryText },
                    text: { value: attendees!.length.toString(), color: Color.SecondaryText },
                  });
                }
                if (!allDayEvent) {
                  let color = Color.Green;
                  const hoursUntilEvent = (new Date(startTime).getTime() - new Date().getTime()) / (1000 * 60 * 60);
                  if (hoursUntilEvent < 4) {
                    color = Color.Red;
                  } else if (hoursUntilEvent < 12) {
                    color = Color.Orange;
                  }
                  accesories.push({
                    icon: { source: Icon.Clock, tintColor: color },
                    date: { value: new Date(startTime), color },
                  });
                }

                const durationFormatted =
                  startTime &&
                  endTime &&
                  formatDuration(intervalToDuration({ start: startTime, end: endTime }), {
                    format: ["hours", "minutes"],
                  });

                return (
                  <List.Item
                    key={id}
                    title={title}
                    subtitle={allDayEvent ? "All day" : `${startHour} - ${endHour} (${durationFormatted})`}
                    accessories={accesories}
                    actions={
                      <ActionPanel>
                        <Action title="Toggle details" onAction={() => setShowDetails(!showDetails)} />
                        <Action
                          title="Delete"
                          onAction={async () => {
                            const apiClient = new GoogleCalendarClient(getAccessToken().token);
                            try {
                              await apiClient.deleteEvent(id, calendar.id);
                              await showToast({
                                title: "Event deleted",
                                style: Toast.Style.Success,
                              });
                              refreshEvents();
                            } catch (error) {
                              console.error(error);
                              await showToast({
                                title: "Failed to delete event",
                                style: Toast.Style.Failure,
                              });
                            }
                          }}
                        />
                      </ActionPanel>
                    }
                    detail={<ListItemMetadata event={event} />}
                  />
                );
              })}
            </List.Section>
          );
        })}
    </List>
  );
}

export default withAccessToken({ authorize: RaycastGoogleOAuthService.authorize })(Command);

function ListItemMetadata({ event }: { event: GoogleCalendarEvent }) {
  const { id, title, startTime, endTime, description, calendar, organizer } = event;
  const startDateFormatted = startTime && format(startTime, "HH:mm MMM d, yyyy");
  const endDateFormatted = endTime && format(endTime, "HH:mm MMM d, yyyy");
  const duration = formatDuration(intervalToDuration({ start: startTime, end: endTime }), {
    format: ["hours", "minutes"],
  });
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={title} />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Description" text={description} />
          <List.Item.Detail.Metadata.Label title="Start" text={startDateFormatted} />
          <List.Item.Detail.Metadata.Label title="End" text={endDateFormatted} />
          <List.Item.Detail.Metadata.Label title="Duration" text={duration} />
          <List.Item.Detail.Metadata.Label title="Organizer" text={organizer?.displayName ?? organizer?.email ?? ""} />
          <List.Item.Detail.Metadata.Label title="Calendar" text={calendar.name} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Attendees" />
          {event.attendees?.map((attendee) => {
            let rsvp = "No response";
            let icon: Icon | null = null;
            let color = Color.SecondaryText;
            const isOrganizer = attendee.email === organizer?.email;
            if (isOrganizer) {
              rsvp = "Organizer";
              color = Color.SecondaryText;
            } else if (attendee.responseStatus === "tentative") {
              rsvp = "Tentative";
              icon = Icon.QuestionMark;
              color = Color.Orange;
            } else if (attendee.responseStatus === "accepted") {
              rsvp = "Accepted";
              icon = Icon.Check;
              color = Color.Green;
            } else if (attendee.responseStatus === "declined") {
              rsvp = "Declined";
              icon = Icon.Xmark;
              color = Color.Red;
            }
            return (
              <List.Item.Detail.Metadata.Label
                key={attendee.email}
                title={attendee.displayName ?? attendee.email ?? ""}
                icon={icon ? { source: icon, tintColor: color } : null}
                text={{ value: rsvp, color }}
              />
            );
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function formatDayName(daysFromNow: number): string {
  const now = new Date();
  const weekDayTime = now.getTime() + daysFromNow * 24 * 60 * 60 * 1000;
  const weekDayName = format(weekDayTime, "EEEE");
  if (daysFromNow === 0) {
    return `Today (${weekDayName})`;
  }
  if (daysFromNow === 1) {
    return `Tomorrow (${weekDayName})`;
  }
  return weekDayName;
}
