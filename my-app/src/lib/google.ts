import { google } from "googleapis";
import { prisma } from "./prisma";

export async function getGoogleOAuthClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId: userId,
      provider: "google",
    },
  });

  if (!account) {
    throw new Error("Google account not linked.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  return oauth2Client;
}

export async function checkFreeBusy(
  userId: string,
  startTime: Date,
  endTime: Date
) {
  const auth = await getGoogleOAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      items: [{ id: "primary" }],
    },
  });

  const calendars = response.data.calendars;
  if (!calendars || !calendars.primary) return true;

  const busySlots = calendars.primary.busy;
  if (!busySlots || busySlots.length === 0) return true;

  return false; // User is busy
}

export async function createGoogleEvent(
  userId: string,
  eventDetails: {
    summary: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendeeEmail: string;
  }
) {
  const auth = await getGoogleOAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: eventDetails.summary,
    description: eventDetails.description,
    start: {
      dateTime: eventDetails.startTime.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: eventDetails.endTime.toISOString(),
      timeZone: "UTC",
    },
    attendees: [{ email: eventDetails.attendeeEmail }],
    conferenceData: {
      createRequest: {
        requestId: Math.random().toString(36).substring(7),
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: event,
    sendUpdates: "all",
  });

  return response.data;
}
