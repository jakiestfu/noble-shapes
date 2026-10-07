import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cn } from "@/lib/utils";

const ToggleGroup = ToggleGroupPrimitive;

function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props<string>) {
  return <TogglePrimitive
    data-slot="toggle-group-item"
    className={cn("inline-flex h-7 shrink-0 cursor-pointer items-center justify-center rounded-sm px-2.5 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-pressed:bg-accent data-pressed:text-foreground", className)}
    {...props}
  />;
}

function Toggle({ className, ...props }: TogglePrimitive.Props<string>) {
  return <TogglePrimitive
    data-slot="toggle"
    className={cn("inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2.5 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-pressed:bg-accent data-pressed:text-foreground", className)}
    {...props}
  />;
}

export { ToggleGroup, ToggleGroupItem, Toggle };
