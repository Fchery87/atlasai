import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { useFocusTrap } from "../../lib/a11y/keyboard-nav";

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void; // eslint-disable-line no-unused-vars
}

const DialogContext = React.createContext<DialogContextValue | undefined>(
  undefined,
);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog provider");
  }
  return context;
}

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void; // eslint-disable-line no-unused-vars
  children: React.ReactNode;
}

export function Dialog({
  open: controlledOpen,
  onOpenChange,
  children,
}: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (onOpenChange) {
        onOpenChange(open);
      } else {
        setInternalOpen(open);
      }
    },
    [onOpenChange],
  );

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleOpenChange]);

  return (
    <DialogContext.Provider
      value={{ open: isOpen, onOpenChange: handleOpenChange }}
    >
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  asChild = false,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useDialogContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: () => onOpenChange(true),
      ...props,
    });
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2",
        className,
      )}
      onClick={() => onOpenChange(true)}
      {...props}
    >
      {children}
    </button>
  );
}

export function DialogPortal({ children }: { children: React.ReactNode }) {
  const { open } = useDialogContext();

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {children}
    </div>,
    document.body,
  );
}

export function DialogOverlay({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      onClick={() => {}}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, onOpenChange } = useDialogContext();
  const ref = React.useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(open);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onOpenChange]);

  // Merge refs
  const mergedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node;
      if (focusTrapRef && typeof focusTrapRef === "object") {
        (
          focusTrapRef as React.MutableRefObject<HTMLDivElement | null>
        ).current = node;
      }
    },
    [focusTrapRef],
  );

  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        ref={mergedRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </DialogPortal>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className,
      )}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      id="dialog-title"
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      id="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
