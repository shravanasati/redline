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
import { revokeSessionAction } from "@/lib/actions/signout";
import { LoaderIcon, LogOutIcon } from "lucide-react";

type RevokeSessionButtonProps = {
  sessionToken: string;
  isCurrentSession?: boolean;
};

export function RevokeSessionButton({
  sessionToken,
  isCurrentSession,
}: RevokeSessionButtonProps) {
  const [open, setOpen] = useState(false);

  const boundRevoke = revokeSessionAction.bind(null, sessionToken);

  async function revokeAction(_prevState: unknown) {
    const result = await boundRevoke();
    if (result.success) {
      setOpen(false);
    }
    return result;
  }

  const [state, action, isPending] = useActionState(revokeAction, null);

  const error =
    state && "error" in state && typeof state.error === "string"
      ? state.error
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Revoke session"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOutIcon className="size-3" />
          Revoke
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Revoke Session</DialogTitle>
          <DialogDescription>
            {isCurrentSession
              ? "This will sign you out of your current session."
              : "This device will be signed out immediately and will require re-authentication."}
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
              Revoke
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
