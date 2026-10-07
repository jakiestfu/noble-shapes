import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuTrigger = MenuPrimitive.Trigger;

function DropdownMenuContent({ className, children, ...props }: MenuPrimitive.Popup.Props) {
  return <MenuPrimitive.Portal>
    <MenuPrimitive.Positioner side="bottom" sideOffset={6} align="end" className="isolate z-50">
      <MenuPrimitive.Popup
        className={cn("min-w-52 rounded-sm border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none", className)}
        {...props}
      >{children}</MenuPrimitive.Popup>
    </MenuPrimitive.Positioner>
  </MenuPrimitive.Portal>;
}

function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return <MenuPrimitive.Item
    className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-sm px-2.5 py-2 text-xs outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground", className)}
    {...props}
  />;
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };
