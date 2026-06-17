"use client";

import { LoaderIcon, Trash2Icon } from "lucide-react";
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
import { deleteMonitorAction } from "@/lib/actions/monitors";

type DeleteMonitorButtonProps = {
  monitorId: string;
  monitorName: string;
};

export function DeleteMonitorButton({
  monitorId,
  monitorName,
}: DeleteMonitorButtonProps) {
  const [open, setOpen] = useState(false);

  const boundDelete = deleteMonitorAction.bind(null, monitorId);

  async function deleteAction(_prevState: unknown) {
    const result = await boundDelete();
    if (result.success) {
      setOpen(false);
    }
    return result;
  }

  const [state, action, isPending] = useActionState(deleteAction, null);

  const error =
    state && "error" in state && typeof state.error === "string"
      ? state.error
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Delete monitor"
          className="hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon className="size-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Monitor</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{monitorName}</span>
            ? This action cannot be undone.
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
              Delete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
