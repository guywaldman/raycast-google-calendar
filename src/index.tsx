import { List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useCalendars } from "./lib/hooks";
import { RaycastGoogleOAuthService } from "./lib/raycast/google-oauth-service";

function Command() {
  const calendars = useCalendars();

  return (
    <List isShowingDetail={true} isLoading={!calendars}>
      {calendars?.map(({ id, summary, timeZone, location, backgroundColor, hidden, description }) => (
        <List.Item
          key={id}
          title={summary}
          accessories={[{ tag: { value: "", color: backgroundColor } }]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title={summary} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Link
                    title="Link"
                    text="Open in browser"
                    target={`https://calendar.google.com/calendar/u/0/embed?src=${id}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Description" text={description} />
                  <List.Item.Detail.Metadata.Label title="Time zone" text={timeZone} />
                  <List.Item.Detail.Metadata.Label title="Location" text={location} />
                  <List.Item.Detail.Metadata.Label title="Hidden" text={hidden ? "Yes" : "No"} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}

export default withAccessToken({ authorize: RaycastGoogleOAuthService.authorize })(Command);
