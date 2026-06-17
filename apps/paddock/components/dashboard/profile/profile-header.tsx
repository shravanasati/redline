import { CalendarIcon, MailIcon, ShieldCheckIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type ProfileHeaderProps = {
  user: {
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
    createdAt: Date;
  };
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <Card className="@container/card bg-gradient-to-br from-primary/5 via-card to-card shadow-xs">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 @sm/card:flex-row @sm/card:items-center">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="size-20 rounded-2xl ring-4 ring-primary/10">
              <AvatarImage
                src={user.image ?? undefined}
                alt={user.name}
                className="object-cover"
              />
              <AvatarFallback className="rounded-2xl text-lg font-semibold bg-primary/10 text-primary">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col gap-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight truncate">
                {user.name}
              </h2>
              {user.emailVerified ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0"
                >
                  <ShieldCheckIcon className="size-3" />
                  Verified
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0"
                >
                  Unverified
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MailIcon className="size-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5 shrink-0" />
                Member since {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
