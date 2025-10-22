import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void; // eslint-disable-line no-unused-vars
  side: "top" | "right" | "bottom" | "left";
}

const SheetContext = React.createContext<SheetContextValue | undefined>(
  undefined,
);

function useSheetContext() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be used within a Sheet provider");
  }
  return context;
}

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void; // eslint-disable-line no-unused-vars
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function Sheet({
  open: controlledOpen,
  onOpenChange,
  children,
  side = "right",
}: SheetProps) {
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
    <SheetContext.Provider
      value={{ open: isOpen, onOpenChange: handleOpenChange, side }}
    >
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  asChild = false,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useSheetContext();

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

export function SheetPortal({ children }: { children: React.ReactNode }) {
  const { open } = useSheetContext();

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">{children}</div>,
    document.body,
  );
}

export function SheetOverlay({
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

const sideStyles = {
  top: "inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
  right:
    "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
  bottom:
    "inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
  left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
};

export function SheetContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { onOpenChange, side } = useSheetContext();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onOpenChange]);

  return (
    <SheetPortal>
      <SheetOverlay />
      <div
        ref={ref}
        className={cn(
          "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          sideStyles[side],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SheetPortal>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-2 text-center sm:text-left",
        className,
      )}
      {...props}
    />
  );
}

export function SheetFooter({
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

export function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export function SheetClose({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange } = useSheetContext();

  return (
    <button
      type="button"
      className={cn(
        "rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
        className,
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    >
      {children}
    </button>
  );
}
