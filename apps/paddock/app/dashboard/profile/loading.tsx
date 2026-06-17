import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function ProfileHeaderSkeleton() {
  return (
    <Card className="shadow-xs">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* Avatar */}
          <Skeleton className="size-20 rounded-2xl shrink-0" />

          {/* Info */}
          <div className="flex flex-1 flex-col gap-3">
            {/* Name + badge */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-40 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>

            {/* Email + joined */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-3.5 rounded-sm shrink-0" />
                <Skeleton className="h-4 w-52 rounded-md" />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-3.5 rounded-sm shrink-0" />
                <Skeleton className="h-4 w-36 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionRowSkeleton() {
  return (
    <li className="flex items-center gap-3 px-6 py-4">
      {/* Device icon placeholder */}
      <Skeleton className="size-9 rounded-lg shrink-0" />

      {/* Details */}
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <Skeleton className="h-4 w-48 rounded-md" />
        <Skeleton className="h-3 w-64 rounded-md" />
      </div>

      {/* Revoke button placeholder */}
      <Skeleton className="h-7 w-16 rounded-md shrink-0" />
    </li>
  );
}

function SessionsListSkeleton() {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-4 w-48 rounded-md" />
          </div>
          <Skeleton className="h-8 w-44 rounded-md shrink-0" />
        </div>
      </CardHeader>

      <Separator />

      <ul className="divide-y">
        <SessionRowSkeleton />
        <SessionRowSkeleton />
        <SessionRowSkeleton />
      </ul>
    </Card>
  );
}

export default function ProfileLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-6 lg:p-6">
      {/* Page title area */}
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-6">
        <ProfileHeaderSkeleton />
        <SessionsListSkeleton />
      </div>
    </div>
  );
}
