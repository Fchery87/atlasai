import * as React from "react";
import { cn } from "../../lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (_value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(
  undefined,
);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (_value: string) => void;
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
}

export function Tabs({
  value,
  onValueChange,
  defaultValue,
  orientation = "horizontal",
  className,
  children,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const currentValue = value !== undefined ? value : internalValue;
  const handleChange = onValueChange || setInternalValue;

  return (
    <TabsContext.Provider
      value={{ value: currentValue, onValueChange: handleChange }}
    >
      <div
        className={cn(
          "w-full",
          orientation === "vertical" ? "flex" : "block",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  // loop is kept for API compatibility but not implemented
  loop?: boolean;
}

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

export function TabsTrigger({
  value,
  disabled = false,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const { value: currentValue, onValueChange } = useTabsContext();
  const isActive = currentValue === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      data-state={isActive ? "active" : "inactive"}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-background text-foreground shadow"
          : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
        className,
      )}
      onClick={() => !disabled && onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}

export function TabsContent({
  value,
  forceMount = false,
  className,
  children,
  ...props
}: TabsContentProps) {
  const { value: currentValue } = useTabsContext();
  const isActive = currentValue === value;

  if (!forceMount && !isActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      aria-hidden={!isActive}
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
