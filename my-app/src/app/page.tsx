import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SignInButton from "@/components/SignInButton";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Schedulr
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          The easiest way to schedule meetings with your Google Calendar.
        </p>

        {session ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Go to Dashboard
          </Link>
        ) : (
          <div className="space-y-4">
            <SignInButton />
          </div>
        )}
      </div>
    </div>
  );
}
