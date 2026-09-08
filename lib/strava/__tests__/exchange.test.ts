import { describe, expect, it } from "vitest";
import { toClientConnection, toStravaTokenResponse, type RawStravaTokenResponse } from "../exchange";

const RAW: RawStravaTokenResponse = {
  access_token: "access-123",
  refresh_token: "refresh-456",
  expires_at: 1_700_000_000,
  athlete: { id: 42, firstname: "Ada", lastname: "Lovelace", profile: "https://example.com/ada.jpg" },
};

describe("toStravaTokenResponse", () => {
  it("maps Strava's snake_case response into our camelCase shape", () => {
    expect(toStravaTokenResponse(RAW)).toEqual({
      accessToken: "access-123",
      refreshToken: "refresh-456",
      expiresAt: 1_700_000_000,
      athlete: { id: 42, firstname: "Ada", lastname: "Lovelace", profile: "https://example.com/ada.jpg" },
    });
  });

  it("defaults a missing athlete profile photo to null", () => {
    const raw: RawStravaTokenResponse = {
      ...RAW,
      athlete: { ...RAW.athlete, profile: null },
    };
    expect(toStravaTokenResponse(raw).athlete.profile).toBeNull();
  });
});

describe("toClientConnection", () => {
  it("strips the refresh_token before crossing the client boundary", () => {
    const full = toStravaTokenResponse(RAW);
    const connection = toClientConnection(full);
    expect(connection).toEqual({
      accessToken: "access-123",
      expiresAt: 1_700_000_000,
      athlete: full.athlete,
    });
    expect(connection).not.toHaveProperty("refreshToken");
  });
});
