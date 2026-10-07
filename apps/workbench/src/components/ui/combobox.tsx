import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const Combobox = ComboboxPrimitive.Root;

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return <div className="relative w-full">
    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn("h-9 w-full rounded-sm border border-input bg-transparent py-1 pl-8 pr-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40", className)}
      {...props}
    />
    <ComboboxPrimitive.Trigger aria-label="Show shapes" className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <ChevronsUpDown className="size-3.5" />
    </ComboboxPrimitive.Trigger>
  </div>;
}

function ComboboxContent({ className, children, ...props }: ComboboxPrimitive.Popup.Props) {
  return <ComboboxPrimitive.Portal>
    <ComboboxPrimitive.Positioner side="bottom" sideOffset={6} align="start" className="isolate z-50">
      <ComboboxPrimitive.Popup
        data-slot="combobox-content"
        className={cn("group/combobox-content max-h-(--available-height) w-[max(var(--anchor-width),320px)] max-w-[calc(100vw-24px)] overflow-hidden rounded-sm border border-border bg-popover text-popover-foreground shadow-lg outline-none", className)}
        {...props}
      >{children}</ComboboxPrimitive.Popup>
    </ComboboxPrimitive.Positioner>
  </ComboboxPrimitive.Portal>;
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return <ComboboxPrimitive.List data-slot="combobox-list" className={cn("max-h-56 overflow-y-auto overscroll-contain p-1.5", className)} {...props} />;
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return <ComboboxPrimitive.Item
    data-slot="combobox-item"
    className={cn("relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50", className)}
    {...props}
  >
    {children}
    <ComboboxPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center"><Check className="size-3.5" /></ComboboxPrimitive.ItemIndicator>
  </ComboboxPrimitive.Item>;
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return <ComboboxPrimitive.Empty data-slot="combobox-empty" className={cn("hidden px-3 py-6 text-center text-sm text-muted-foreground group-data-empty/combobox-content:block", className)} {...props} />;
}

export { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty };
