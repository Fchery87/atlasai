import * as React from "react";
import { cn } from "../../lib/utils";

export function Badge({
  className,
  variant = "secondary",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "secondary" | "success" | "error" }) {
  const variants = {
    secondary: "bg-secondary text-secondary-foreground",
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
  } as const;
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs", variants[variant], className)} {...props} />;
}