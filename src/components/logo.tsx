import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export function Logo({
  className,
  showText = true,
  size = "default",
}: {
  className?: string;
  showText?: boolean;
  size?: "default" | "sm" | "lg";
}) {
  const iconSize = {
    sm: "size-7",
    default: "size-8",
    lg: "size-10",
  }[size];

  const textSize = {
    sm: "text-sm",
    default: "text-[15px]",
    lg: "text-lg",
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-xs transition-transform duration-200 hover:scale-105",
          iconSize,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-4.5"
        >
          {/* Architectural desk / workspace plane */}
          <path
            d="M3 8.5L12 3.5L21 8.5L12 13.5L3 8.5Z"
            fill="currentColor"
            fillOpacity="0.9"
          />
          {/* Left cabinet leg */}
          <path
            d="M3 9.5V17L7.5 19.5V12L3 9.5Z"
            fill="currentColor"
            fillOpacity="0.45"
          />
          {/* Right leg & warm brass accent facet */}
          <path
            d="M21 9.5V17L16.5 19.5V12L21 9.5Z"
            fill="currentColor"
            fillOpacity="0.6"
          />
          {/* Studio warm brass diamond node */}
          <path
            d="M12 15L15 13.33V16.67L12 18.33L9 16.67V13.33L12 15Z"
            className="fill-primary"
          />
        </svg>
      </span>
      {showText ? (
        <span className="flex flex-col">
          <span
            className={cn(
              "font-heading font-bold tracking-tight text-foreground leading-none",
              textSize,
            )}
          >
            {APP_NAME}
          </span>
          <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground/80 leading-none mt-0.5">
            Studio Desk
          </span>
        </span>
      ) : null}
    </span>
  );
}
