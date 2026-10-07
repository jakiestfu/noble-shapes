import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 touch-manipulation cursor-pointer items-center justify-center gap-2 rounded-sm border border-transparent text-sm font-medium whitespace-nowrap outline-none transition-[color,background-color,border-color] duration-100 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50",
  { variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/80",
      outline: "border-border bg-background hover:bg-muted",
      secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
      ghost: "hover:bg-accent/70",
    },
    size: { default: "h-8 px-3", sm: "h-7 px-2.5 text-xs", lg: "h-9 px-4", icon: "size-8" },
  }, defaultVariants: { variant: "ghost", size: "default" } },
);

function Button({ className, variant, size, ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
