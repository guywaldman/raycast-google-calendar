import { useConfig, useUpcomingEvents, useUpcomingTasks } from "@/lib/extension/hooks";
import { GoogleCalendarClient } from "@/lib/gcal/gcal-api-client";
import { GoogleCalendarEvent, GoogleCalendarTask } from "@/lib/gcal/models";
import { RaycastGoogleOAuthService } from "@/lib/gcal/raycast-google-auth-service";
import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { getAccessToken, withAccessToken } from "@raycast/utils";
import { format, formatDuration, intervalToDuration } from "date-fns";
import { useMemo, useState } from "react";

type Item =
  | {
      kind: "event";
      data: GoogleCalendarEvent;
    }
  | {
      kind: "task";
      data: GoogleCalendarTask;
    };

function Command() {
  const { data: events, isLoading: isEventsLoading, revalidate: refreshEvents } = useUpcomingEvents();
  const { value: config, isLoading: isConfigLoading } = useConfig();
  const { data: tasks, isLoading: isTasksLoading, revalidate: refreshTasks } = useUpcomingTasks();
  const [showDetails, setShowDetails] = useState(false);

  // Partition by today, tomorrow, etc.
  const itemsByDay = useMemo<Record<number, Item[]>>(() => {
    if (!events || !tasks) {
      return {};
    }
    const filteredEvents = events.filter((event) => !config?.calendarConfiguration?.[event.calendar.id]?.disabled);
    const timeNow = new Date().getTime();
    const startOfDayNow = new Date(timeNow).setHours(0, 0, 0, 0);

    const itemsByDaysAhead: Record<number, Item[]> = {};
    for (const event of filteredEvents) {
      const startOfDayItem = new Date(event.startTime).setHours(0, 0, 0, 0);
      const daysFromNow = intervalToDuration({ start: startOfDayNow, end: startOfDayItem }).days ?? 0;
      if (!itemsByDaysAhead[daysFromNow]) {
        itemsByDaysAhead[daysFromNow] = [];
      }
      itemsByDaysAhead[daysFromNow].push({ kind: "event", data: event });
    }
    for (const task of tasks) {
      const startOfDayItem = new Date(task.due).setHours(0, 0, 0, 0);
      const daysFromNow = intervalToDuration({ start: startOfDayNow, end: startOfDayItem }).days ?? 0;
      if (!itemsByDaysAhead[daysFromNow]) {
        itemsByDaysAhead[daysFromNow] = [];
      }
      itemsByDaysAhead[daysFromNow].push({ kind: "task", data: task });
    }

    // Sort items in each day
    Object.values(itemsByDaysAhead).forEach((itemsInDay) => {
      itemsInDay.sort((a, b) => {
        if (a.kind === "event" && b.kind === "event") {
          const allDayEventA = intervalToDuration({ start: a.data.startTime, end: a.data.endTime }).days! >= 1;
          const allDayEventB = intervalToDuration({ start: b.data.startTime, end: b.data.endTime }).days! >= 1;

          if (allDayEventA && !allDayEventB) {
            return 1;
          } else if (!allDayEventA && allDayEventB) {
            return -1;
          } else {
            return new Date(a.data.startTime).getTime() - new Date(b.data.startTime).getTime();
          }
        } else if (a.kind === "task" && b.kind === "task") {
          return new Date(a.data.due).getTime() - new Date(b.data.due).getTime();
        } else if (a.kind === "task" && b.kind === "event") {
          // Prioritize events over tasks
          return -1;
        } else if (a.kind === "event" && b.kind === "task") {
          // Prioritize events over tasks
          return 1;
        }
        return 0;
      });
    });
    return itemsByDaysAhead;
  }, [events, tasks, config]);

  const isLoading = isEventsLoading || isTasksLoading || isConfigLoading;

  return (
    <List isLoading={isLoading} isShowingDetail={showDetails}>
      {config &&
        Object.keys(itemsByDay).length > 0 &&
        Object.entries(itemsByDay).map(([day, itemsInDay]) => {
          const dayTitle = formatDayName(parseInt(day));
          return (
            <List.Section key={dayTitle} title={dayTitle}>
              {itemsInDay?.map((event) =>
                event.kind === "event" ? (
                  <ListItemEvent
                    key={event.data.id}
                    event={event.data}
                    onToggleDetails={() => setShowDetails(!showDetails)}
                    refresh={() => {
                      refreshEvents();
                      refreshTasks();
                    }}
                  />
                ) : (
                  <ListItemTask key={event.data.id} task={event.data} />
                ),
              )}
            </List.Section>
          );
        })}
    </List>
  );
}

export default withAccessToken({ authorize: RaycastGoogleOAuthService.authorize })(Command);

function ListItemEvent({
  event,
  onToggleDetails,
  refresh,
}: {
  event: GoogleCalendarEvent;
  onToggleDetails: () => void;
  refresh: () => void;
}) {
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
    accesories.push(getTimeAccessory(new Date(startTime)));
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
          <Action title="Toggle Details" onAction={() => onToggleDetails()} />
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
                refresh();
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
}

function ListItemTask({ task }: { task: GoogleCalendarTask }) {
  const { id, title, due } = task;
  console.log({ due });

  const accesories: List.Item.Accessory[] = [{ tag: { value: "Task", color: Color.Magenta } }, getTimeAccessory(new Date(due))];

  return <List.Item key={id} title={title} accessories={accesories} />;
}

function ListItemMetadata({ event }: { event: GoogleCalendarEvent }) {
  const { title, startTime, endTime, description, calendar, organizer } = event;
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

function getTimeAccessory(startTime: Date): List.Item.Accessory {
  let color = Color.Green;
  const hoursUntilEvent = Math.ceil((startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60));
  if (hoursUntilEvent < 4) {
    color = Color.Red;
  } else if (hoursUntilEvent < 12) {
    color = Color.Orange;
  }
  return {
    icon: { source: Icon.Clock, tintColor: color },
    date: { value: startTime, color },
  };
}
