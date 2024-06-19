import { Action, ActionPanel, Color, List, Toast, showToast } from "@raycast/api";
import { getAccessToken, withAccessToken } from "@raycast/utils";
import { format, intervalToDuration, formatDistance } from "date-fns";
import { useConfig, useUpcomingEvents } from "./lib/hooks";
import { RaycastGoogleOAuthService } from "./lib/raycast/google-oauth-service";
import { GoogleCalendarEvent } from "./lib/models";
import { useMemo, useState } from "react";
import { GoogleCalendarClient } from "./lib/api-client";

function Command() {
  const { data: events, isLoading: isEventsLoading } = useUpcomingEvents();
  const { value: config, isLoading: isConfigLoading } = useConfig();
  const [showDetails, setShowDetails] = useState(false);

  // Partition by today, tomorrow, etc.
  const eventsByDay = useMemo(() => {
    if (!events) {
      return null;
    }
    const filteredEvents = events.filter((event) => !config?.calendarConfiguration?.[event.calendar.id]?.hidden);
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
                const { id, title, startTime, endTime, calendar, organizerDisplayName } = event;
                const startDateFormatted = startTime && format(startTime, "HH:mm MMM d, yyyy");
                const timeFromNow =
                  startTime && formatDistance(startTime, new Date(), { addSuffix: false }).replace("about ", "");
                const isToday = day === "Today";
                const allDayEvent = intervalToDuration({ start: startTime, end: endTime }).days! >= 1;
                const duration = startTime && endTime && formatDistance(startTime, endTime, { addSuffix: false });

                return (
                  <List.Item
                    key={id}
                    title={title}
                    subtitle={allDayEvent ? "All day event" : isToday ? `Starts in ${timeFromNow}` : ""}
                    accessories={[
                      { tag: calendar.name ?? "" },
                      { text: { value: allDayEvent ? "" : startDateFormatted, color: Color.SecondaryText } },
                    ]}
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
  const { id, title, startTime, endTime, calendar, organizerDisplayName } = event;
  const startDateFormatted = startTime && format(startTime, "HH:mm MMM d, yyyy");
  const endDateFormatted = endTime && format(endTime, "HH:mm MMM d, yyyy");
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={title} />
          <List.Item.Detail.Metadata.Separator />

          {startDateFormatted && <List.Item.Detail.Metadata.Label title="Start" text={startDateFormatted} />}
          {endDateFormatted && <List.Item.Detail.Metadata.Label title="End" text={endDateFormatted} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function formatDayName(daysFromNow: number): string {
  const now = new Date();
  if (daysFromNow === 0) {
    return "Today";
  }
  if (daysFromNow === 1) {
    return "Tomorrow";
  }
  return format(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000, "EEEE");
}
