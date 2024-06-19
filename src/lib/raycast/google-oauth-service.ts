import { OAuthService } from "@raycast/utils";

export const RaycastGoogleOAuthService = OAuthService.google({
  clientId: "786675105585-4d35rh6gv0sj2v1mc57ibbe41aj69ip1.apps.googleusercontent.com",
  scope: "https://www.googleapis.com/auth/calendar",
});
