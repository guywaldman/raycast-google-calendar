import { OAuthService } from "@raycast/utils";

export const RaycastGoogleOAuthService = OAuthService.google({
  clientId: "786675105585-3d5p5en3vnj9ep7ujfkbbggso1tucckf.apps.googleusercontent.com",
  scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/meetings.space.created",
});
