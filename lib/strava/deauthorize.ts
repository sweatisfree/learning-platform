import "server-only";

const STRAVA_DEAUTHORIZE_URL = "https://www.strava.com/oauth/deauthorize";

// Revokes our access on Strava's side, so the token is actually dead rather
// than merely forgotten locally, and Thríamvos disappears from the user's
// Strava connected-apps list.
//
// Best-effort by design, and identical in both call sites (account deletion
// and integration disconnect): a Strava outage must never block a user from
// deleting their account or dropping the integration. Our stored copy of the
// token is removed regardless, so the worst case is a stale authorization the
// user can revoke in Strava's own settings.
export async function deauthorizeStrava(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(STRAVA_DEAUTHORIZE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      console.error("Strava deauthorize returned", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Strava deauthorize failed", error instanceof Error ? error.message : error);
    return false;
  }
}
