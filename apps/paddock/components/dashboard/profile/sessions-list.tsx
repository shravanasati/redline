import {
  ClockIcon,
  GlobeIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RevokeAllSessionsButton } from "./revoke-all-sessions-button";
import { RevokeSessionButton } from "./revoke-session-button";

type Session = {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  location?: string | null;
  createdAt: Date;
  expiresAt: Date;
};

type SessionsListProps = {
  sessions: Session[];
  currentSessionToken: string;
};

function parseUserAgent(ua: string | null | undefined): {
  browser: string;
  os: string;
  device: "desktop" | "mobile" | "tablet";
} {
  if (!ua)
    return { browser: "Unknown Browser", os: "Unknown OS", device: "desktop" };

  const uaLower = ua.toLowerCase();

  // Device type
  let device: "desktop" | "mobile" | "tablet" = "desktop";
  if (/tablet|ipad/.test(uaLower)) device = "tablet";
  else if (/mobile|android|iphone/.test(uaLower)) device = "mobile";

  // Browser
  let browser = "Unknown Browser";
  if (uaLower.includes("edg/")) browser = "Edge";
  else if (uaLower.includes("chrome/")) browser = "Chrome";
  else if (uaLower.includes("firefox/")) browser = "Firefox";
  else if (uaLower.includes("safari/") && !uaLower.includes("chrome"))
    browser = "Safari";
  else if (uaLower.includes("opr/") || uaLower.includes("opera"))
    browser = "Opera";

  // OS
  let os = "Unknown OS";
  if (uaLower.includes("windows")) os = "Windows";
  else if (uaLower.includes("mac os") || uaLower.includes("macos"))
    os = "macOS";
  else if (uaLower.includes("iphone") || uaLower.includes("ipad")) os = "iOS";
  else if (uaLower.includes("android")) os = "Android";
  else if (uaLower.includes("linux")) os = "Linux";

  return { browser, os, device };
}

function DeviceIcon({ device }: { device: "desktop" | "mobile" | "tablet" }) {
  const cls = "size-4 shrink-0 text-muted-foreground";
  if (device === "mobile") return <SmartphoneIcon className={cls} />;
  if (device === "tablet") return <TabletIcon className={cls} />;
  return <MonitorIcon className={cls} />;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatExpiry(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function SessionsList({
  sessions,
  currentSessionToken,
}: SessionsListProps) {
  const otherSessionsCount = sessions.filter(
    (s) => s.token !== currentSessionToken,
  ).length;

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Active Sessions</CardTitle>
            <CardDescription className="mt-1">
              {sessions.length} active session{sessions.length !== 1 ? "s" : ""}{" "}
              across your devices
            </CardDescription>
          </div>
          {otherSessionsCount > 0 && <RevokeAllSessionsButton />}
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <Separator />
        <ul className="divide-y">
          {sessions.map((session, _idx) => {
            const isCurrent = session.token === currentSessionToken;
            const { browser, os, device } = parseUserAgent(session.userAgent);

            return (
              <li
                key={session.id}
                className={`flex items-center gap-3 px-6 py-4 transition-colors ${
                  isCurrent ? "bg-primary/[0.03]" : "hover:bg-muted/40"
                }`}
              >
                {/* Device icon */}
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    isCurrent
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <DeviceIcon device={device} />
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col gap-0.5 min-w-0 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">
                      {browser} · {os}
                    </span>
                    {isCurrent && (
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/10 text-primary px-1.5 py-0 text-[10px]"
                      >
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {session.location && (
                      <span className="flex items-center gap-1">
                        <GlobeIcon className="size-3" />
                        {session.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3" />
                      Created {formatRelativeTime(session.createdAt)}
                    </span>
                    <span className="text-muted-foreground/60">
                      Expires {formatExpiry(session.expiresAt)}
                    </span>
                  </div>
                </div>

                {/* Revoke */}
                <RevokeSessionButton
                  sessionToken={session.token}
                  isCurrentSession={isCurrent}
                />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
