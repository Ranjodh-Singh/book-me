import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkFreeBusy } from "@/lib/google";
import { addMinutes, parseISO, setHours, setMinutes } from "date-fns";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  const eventSlug = searchParams.get("eventSlug");
  const dateStr = searchParams.get("date");

  if (!username || !eventSlug || !dateStr) {
    return NextResponse.json({ message: "Missing params" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        eventTypes: {
          where: { slug: eventSlug },
        },
      },
    });

    if (!user || user.eventTypes.length === 0) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const eventType = user.eventTypes[0];
    const targetDate = parseISO(dateStr);

    // Business hours logic: 9 AM to 5 PM
    const startOfBusiness = setMinutes(setHours(targetDate, 9), 0);
    const endOfBusiness = setMinutes(setHours(targetDate, 17), 0);

    const availableSlots: string[] = [];
    let currentSlot = startOfBusiness;

    while (currentSlot < endOfBusiness) {
      const slotEnd = addMinutes(currentSlot, eventType.duration);

      if (slotEnd > endOfBusiness) {
        break;
      }

      // In a real app, we'd bulk query free/busy for the whole day to avoid API rate limits
      // For simplicity, we are checking slot by slot (Not ideal for production, but shows the integration)
      let isFree = true;
      try {
         isFree = await checkFreeBusy(user.id, currentSlot, slotEnd);
      } catch (e) {
         console.error("Google Calendar API Error:", e);
         // Default to not showing if error fetching calendar
         isFree = false;
      }

      if (isFree) {
         // Also check our database for conflicting bookings
         const conflictingBooking = await prisma.booking.findFirst({
           where: {
             userId: user.id,
             OR: [
               {
                 startTime: { lt: slotEnd, gte: currentSlot },
               },
               {
                 endTime: { gt: currentSlot, lte: slotEnd },
               }
             ]
           }
         });

         if (!conflictingBooking) {
            availableSlots.push(currentSlot.toISOString());
         }
      }

      // Increment by 30 mins
      currentSlot = addMinutes(currentSlot, 30);
    }

    return NextResponse.json({ slots: availableSlots });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
