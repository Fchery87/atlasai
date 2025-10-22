import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void; // eslint-disable-line no-unused-vars
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
}

/**
 * Reusable confirmation dialog component
 * Replaces window.confirm() with a proper accessible dialog
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for using confirmation dialogs
 * Provides a promise-based API similar to window.confirm()
 */
export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "default" | "destructive";
    resolve?: (value: boolean) => void; // eslint-disable-line no-unused-vars
  }>({
    open: false,
    title: "",
    description: "",
  });

  const confirm = React.useCallback(
    (
      title: string,
      description: string,
      options?: {
        confirmLabel?: string;
        cancelLabel?: string;
        variant?: "default" | "destructive";
      },
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          title,
          description,
          confirmLabel: options?.confirmLabel,
          cancelLabel: options?.cancelLabel,
          variant: options?.variant,
          resolve,
        });
      });
    },
    [],
  );

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open && state.resolve) {
        state.resolve(false);
      }
      setState((prev) => ({ ...prev, open }));
       
    },
    [state.resolve],
  );

  const handleConfirm = React.useCallback(() => {
    if (state.resolve) {
      state.resolve(true);
    }
    setState((prev) => ({ ...prev, open: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.resolve]);

  const dialog = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={handleOpenChange}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
    />
  );

  return { confirm, dialog };
}
