import { OAuthService } from "@raycast/utils";

export const RaycastGoogleOAuthService = OAuthService.google({
  clientId: "...",
  scope: "https://www.googleapis.com/auth/calendar",
});
