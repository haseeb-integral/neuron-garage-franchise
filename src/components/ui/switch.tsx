import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, onCheckedChange, ...props }, ref) => {
  const handleCheckedChange = (checked: boolean) => {
    onCheckedChange?.(checked);

    if (!checked && typeof window !== "undefined" && window.location.pathname.includes("city-scoring")) {
      window.setTimeout(() => {
        const switchRoot = document.activeElement as HTMLElement | null;
        const controlGroup = switchRoot?.closest("div");
        const isCompareModeSwitch = controlGroup?.textContent?.includes("Compare Mode");

        if (!isCompareModeSwitch) return;

        document
          .querySelectorAll<HTMLElement>("[role='checkbox'][data-state='checked']")
          .forEach((checkbox) => {
            const rankedMarketsCard = checkbox.closest("div")?.closest("div")?.closest("div")?.textContent?.includes("Ranked Markets");
            if (rankedMarketsCard) checkbox.click();
          });
      }, 0);
    }
  };

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
      onCheckedChange={handleCheckedChange}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
