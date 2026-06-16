"use client";

import {
  AlertCircleIcon,
  BellIcon,
  CircleUserRoundIcon,
  CreditCardIcon,
  EllipsisVerticalIcon,
  LogInIcon,
  LogOutIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

export function NavUser({
  user,
}: {
  user: {
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    isPending: boolean;
    error?: { message?: string } | string | null;
  };
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [signOutOpen, setSignOutOpen] = useState(false);

  if (user.isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex h-12 w-full items-center gap-2 rounded-xl px-3 text-left">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="grid flex-1 gap-1.5 text-left">
              <Skeleton className="h-3 w-20 rounded-sm" />
              <Skeleton className="h-2.5 w-32 rounded-sm" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (user.error) {
    const errorMsg =
      typeof user.error === "string"
        ? user.error
        : user.error &&
          typeof user.error === "object" &&
          "message" in user.error
          ? String(user.error.message)
          : "Please sign in again";

    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex h-12 w-full items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 text-left transition-colors hover:bg-destructive/10">
            <AlertCircleIcon className="size-4 shrink-0 text-destructive animate-pulse" />
            <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
              <span className="truncate font-medium text-destructive-foreground text-xs">
                Auth Error
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {errorMsg}
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="ml-auto flex size-7 items-center justify-center rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
              title="Sign in"
            >
              <LogInIcon className="size-4" />
            </button>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage
                  src={user.avatar ?? undefined}
                  alt={user.name ?? undefined}
                />
                <AvatarFallback className="rounded-lg">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : "GU"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.name || "Guest User"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email || "Not signed in"}
                </span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={user.avatar ?? undefined}
                    alt={user.name ?? undefined}
                  />
                  <AvatarFallback className="rounded-lg">
                    {user.name ? user.name.slice(0, 2).toUpperCase() : "GU"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.name || "Guest User"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email || "Not signed in"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link href="/dashboard/profile" className="flex items-center gap-2">
                  <CircleUserRoundIcon />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/dashboard/notifications" className="flex items-center gap-2">
                  <BellIcon />
                  Notifications
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setSignOutOpen(true)}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
          <DialogContent showCloseButton={false} className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Sign out?</DialogTitle>
              <DialogDescription>
                You will be signed out of your account and redirected to the
                login page.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSignOutOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setSignOutOpen(false);
                  await authClient.signOut();
                  router.push("/login");
                }}
              >
                Sign out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
