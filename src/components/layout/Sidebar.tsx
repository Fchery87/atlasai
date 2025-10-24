import * as React from "react";
import { cn } from "../../lib/utils";

interface SidebarProps {
  className?: string;
  children?: React.ReactNode;
}

export function Sidebar({ className, children }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col w-16 bg-background border-r border-border/40 h-full",
        className,
      )}
    >
      {children}
    </aside>
  );
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
  className,
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center h-14 w-full gap-1 transition-colors relative group",
        active
          ? "text-accent bg-accent/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
        className,
      )}
      aria-label={label}
      title={label}
    >
      {active && (
        <div className="absolute left-0 w-0.5 h-8 bg-accent rounded-r" />
      )}
      <div className="text-lg">{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export function SidebarDivider() {
  return <div className="h-px bg-border/40 mx-2 my-1" />;
}
