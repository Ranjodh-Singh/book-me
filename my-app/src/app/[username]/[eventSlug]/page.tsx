"use client";

import { useState, useEffect } from "react";
import { format, addDays, startOfToday, parseISO } from "date-fns";

export default function BookingPage({
  params,
}: {
  params: { username: string; eventSlug: string };
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    // Only initialize the date on the client side to avoid hydration mismatches
    setSelectedDate(startOfToday());
  }, []);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fetchingSlots, setFetchingSlots] = useState(false);

  useEffect(() => {
    async function fetchSlots() {
      if (!selectedDate) return;
      setFetchingSlots(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const res = await fetch(
          `/api/bookings/slots?username=${params.username}&eventSlug=${params.eventSlug}&date=${dateStr}`
        );
        if (!res.ok) throw new Error("Failed to fetch slots");
        const data = await res.json();
        setAvailableSlots(data.slots || []);
        setSelectedTime(null);
      } catch (err) {
        console.error(err);
        setAvailableSlots([]);
      } finally {
        setFetchingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDate, params.username, params.eventSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) {
      setError("Please select a time.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: params.username,
          eventSlug: params.eventSlug,
          name,
          email,
          notes,
          startTime: selectedTime,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Booking failed.");
      }

      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "An error occurred.");
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Booking Confirmed!</h2>
          <p className="mt-2 text-sm text-gray-600">
            A calendar invitation has been sent to your email address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Calendar / Details */}
        <div className="md:w-1/2 p-8 border-r border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Book a Session</h1>
          <p className="text-gray-500 mb-6">Select a date and time that works for you.</p>

          <div className="mb-6">
             <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
             {selectedDate ? (
               <div className="grid grid-cols-5 gap-2">
                  {[...Array(10)].map((_, i) => {
                    const date = addDays(startOfToday(), i);
                    const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={`p-2 rounded-md border text-center flex flex-col items-center justify-center
                          ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-500'}
                        `}
                      >
                        <span className="text-xs uppercase">{format(date, 'E')}</span>
                        <span className="text-lg font-semibold">{format(date, 'd')}</span>
                      </button>
                    )
                  })}
               </div>
             ) : (
               <div className="text-sm text-gray-500">Loading dates...</div>
             )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Times</label>
            {fetchingSlots ? (
              <p className="text-sm text-gray-500">Loading slots...</p>
            ) : availableSlots.length === 0 ? (
               <p className="text-sm text-gray-500">No slots available on this date.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-2">
                {availableSlots.map((time) => {
                   const timeObj = parseISO(time);
                   const isSelected = selectedTime === time;
                   return (
                     <button
                       key={time}
                       type="button"
                       onClick={() => setSelectedTime(time)}
                       className={`py-2 px-3 text-sm rounded-md border font-medium
                         ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200 hover:border-indigo-600'}
                       `}
                     >
                        {format(timeObj, 'h:mm a')}
                     </button>
                   );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-1/2 p-8 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Details</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !selectedTime}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
