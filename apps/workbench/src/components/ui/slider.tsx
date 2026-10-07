import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

export function Slider({ className, value, ...props }: SliderPrimitive.Root.Props) {
  return <SliderPrimitive.Root data-slot="slider" className={cn("w-full", className)} value={value} thumbAlignment="edge" {...props}>
    <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none">
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Indicator className="h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden" />
    </SliderPrimitive.Control>
  </SliderPrimitive.Root>;
}
