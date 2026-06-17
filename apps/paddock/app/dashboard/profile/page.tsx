import { headers } from "next/headers";
import { ProfileHeader } from "@/components/dashboard/profile/profile-header";
import { SessionsList } from "@/components/dashboard/profile/sessions-list";
import Unauthenticated from "@/components/unauthorized";
import { auth, getSession } from "@/lib/auth";

export const metadata = {
  title: "Profile",
  description: "Manage your profile and active sessions.",
};

export default async function ProfilePage() {
  const reqHeaders = await headers();

  const session = await getSession({ headers: reqHeaders });

  if (!session) {
    return <Unauthenticated />;
  }

  const sessionsResponse = await auth.api.listSessions({
    headers: reqHeaders,
  });

  const sessions = sessionsResponse ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-6 lg:p-6 @container/main">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and active sessions.
        </p>
      </div>

      <div className="grid gap-6 @2xl/main:grid-cols-[1fr_auto]">
        {/* Left / main column */}
        <div className="flex flex-col gap-6 min-w-0">
          <ProfileHeader
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image,
              emailVerified: session.user.emailVerified,
              createdAt: session.user.createdAt,
            }}
          />

          <SessionsList
            sessions={sessions.map((s) => ({
              id: s.id,
              token: s.token,
              userAgent: s.userAgent,
              ipAddress: s.ipAddress,
              location: s.location,
              createdAt: new Date(s.createdAt),
              expiresAt: new Date(s.expiresAt),
            }))}
            currentSessionToken={session.session.token}
          />
        </div>
      </div>
    </div>
  );
}
