import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createGoogleEvent } from "@/lib/google";
import { addMinutes, parseISO } from "date-fns";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, eventSlug, name, email, notes, startTime } = body;

    if (!username || !eventSlug || !name || !email || !startTime) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        eventTypes: {
          where: { slug: eventSlug },
        },
      },
    });

    if (!user || user.eventTypes.length === 0) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    const eventType = user.eventTypes[0];
    const startDate = parseISO(startTime);
    const endDate = addMinutes(startDate, eventType.duration);

    // Create booking in database
    const booking = await prisma.booking.create({
      data: {
        eventTypeId: eventType.id,
        userId: user.id,
        name,
        email,
        startTime: startDate,
        endTime: endDate,
        notes,
      },
    });

    // Attempt to create Google Calendar Event with Meet link
    try {
      await createGoogleEvent(user.id, {
        summary: `${eventType.title} with ${name}`,
        description: `Booking for ${name} (${email}).\nNotes: ${notes || "None"}`,
        startTime: startDate,
        endTime: endDate,
        attendeeEmail: email,
      });
    } catch (googleError) {
      console.error("Failed to sync to Google Calendar:", googleError);
      // In a real app, you might want to retry later or notify the user
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
