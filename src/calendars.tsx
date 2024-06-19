import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useCalendars, useConfig } from "./lib/hooks";
import { RaycastGoogleOAuthService } from "./lib/raycast/google-oauth-service";
import { useMemo, useState } from "react";
import { ExtensionCalendarConfigurationItem } from "./lib/config";

function Command() {
  const { data: calendars, isLoading: isCalendarsLoading } = useCalendars();
  const { value: config, setValue: updateConfig, isLoading: isConfigLoading } = useConfig();
  const [showDetails, setShowDetails] = useState(false);

  const isLoading = isCalendarsLoading || isConfigLoading;

  return (
    <List isShowingDetail={showDetails} isLoading={isLoading}>
      {config &&
        calendars?.map(({ id, name, timezone, description, location, backgroundColor, hidden }) => {
          const isHidden = config!.calendarConfiguration?.[id]?.hidden;

          return (
            <List.Item
              key={id}
              title={name}
              accessories={[
                isHidden
                  ? { icon: Icon.Xmark, tag: { value: "Hidden", color: Color.Red } }
                  : { icon: Icon.Check, tag: { value: "Visible", color: Color.Green } },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={isHidden ? "Disable" : "Enable"}
                    onAction={() => {
                      const previousCalendarConfiguration = config?.calendarConfiguration[id];
                      const newCalendarConfiguration = {
                        ...previousCalendarConfiguration,
                        hidden: !isHidden,
                      } satisfies ExtensionCalendarConfigurationItem;
                      const newConfig = {
                        ...config,
                        calendarConfiguration: { ...config!.calendarConfiguration, [id]: newCalendarConfiguration },
                      };
                      updateConfig(newConfig)
                        .then(() => {
                          showToast({
                            title: "Successfully updated calendar configuration",
                            message: `Calendar '${name}' is now ${isHidden ? "hidden" : "visible"}`,
                            style: Toast.Style.Success,
                          });
                        })
                        .catch((err) => {
                          showToast({
                            title: "Failed to update calendar configuration",
                            style: Toast.Style.Failure,
                            message: err.message,
                          });
                        });
                    }}
                  />
                  <Action title="Toggle details" onAction={() => setShowDetails(!showDetails)} />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      {description && <List.Item.Detail.Metadata.Label title={description} />}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link
                        title="Link"
                        text="Open in browser"
                        target={`https://calendar.google.com/calendar/u/0/embed?src=${id}`}
                      />
                      <List.Item.Detail.Metadata.Label title="Description" text={description} />
                      <List.Item.Detail.Metadata.Label title="Time zone" text={timezone} />
                      <List.Item.Detail.Metadata.Label title="Location" text={location} />
                      <List.Item.Detail.Metadata.Label title="Hidden" text={hidden ? "Yes" : "No"} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })}
    </List>
  );
}

export default withAccessToken({ authorize: RaycastGoogleOAuthService.authorize })(Command);
