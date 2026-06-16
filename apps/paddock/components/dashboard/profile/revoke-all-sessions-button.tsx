"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { revokeOtherSessionsAction } from "@/lib/actions/signout";
import { LoaderIcon, ShieldOffIcon } from "lucide-react";

export function RevokeAllSessionsButton() {
  const [open, setOpen] = useState(false);

  async function revokeAllAction(_prevState: unknown) {
    const result = await revokeOtherSessionsAction();
    if (result.success) {
      setOpen(false);
    }
    return result;
  }

  const [state, action, isPending] = useActionState(revokeAllAction, null);

  const error =
    state && "error" in state && typeof state.error === "string"
      ? state.error
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
        >
          <ShieldOffIcon className="size-4" />
          Revoke all other sessions
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Revoke All Other Sessions</DialogTitle>
          <DialogDescription>
            All devices except your current session will be signed out
            immediately. They will need to sign in again to access your account.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive rounded-xl bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}

        <form action={action}>
          <DialogFooter showCloseButton>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending && <LoaderIcon className="size-4 animate-spin" />}
              Revoke all
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
