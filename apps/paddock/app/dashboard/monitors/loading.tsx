import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function KpiCardSkeleton() {
  return (
    <Card className="@container/card">
      <CardHeader>
        {/* Description row */}
        <Skeleton className="h-4 w-32" />
        {/* Big number */}
        <Skeleton className="h-9 w-16 mt-1" />
        {/* Badge */}
        <Skeleton className="h-6 w-20 rounded-full" />
      </CardHeader>
      {/* Footer line */}
      <div className="px-5 pb-5">
        <Skeleton className="h-4 w-44" />
      </div>
    </Card>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="hidden md:block h-4 w-56" />
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="hidden sm:block h-4 w-10" />
      <Skeleton className="hidden lg:block h-4 w-8 ml-auto" />
    </div>
  );
}

export default function MonitorsLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

          {/* Page header skeleton */}
          <div className="flex items-center justify-between px-4 lg:px-6">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-7 w-32 rounded-2xl" />
          </div>

          {/* KPI cards skeleton */}
          <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-3 dark:*:data-[slot=card]:bg-card">
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </div>

          {/* Table card skeleton */}
          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader className="border-b [.border-b]:pb-5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-64 mt-1" />
              </CardHeader>
              <CardContent className="p-0 [--card-spacing:0]">
                {/* Table header */}
                <div className="flex items-center gap-3 px-4 py-2.5 border-b">
                  {["w-28", "w-16", "w-48 hidden md:block", "w-16", "w-10 hidden sm:block", "w-8 hidden lg:block ml-auto"].map(
                    (w, i) => (
                      <Skeleton key={i} className={`h-3.5 ${w}`} />
                    ),
                  )}
                </div>
                {/* Table rows */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
