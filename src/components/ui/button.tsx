import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border font-sans text-base font-bold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-guard-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-transparent bg-guard-blue text-canvas-white hover:bg-guard-blue-deep",
        outline: "border-guard-blue bg-transparent text-guard-blue hover:bg-guard-blue/8",
        secondary: "border-transparent bg-ash text-graphite hover:bg-mist",
        ghost: "border-transparent text-graphite hover:bg-ash",
        link: "border-transparent text-guard-blue underline decoration-1 underline-offset-[3px] hover:text-guard-blue-deep",
      },
      size: {
        default: "h-11 gap-2 px-6",
        sm: "h-11 gap-1.5 px-4 text-sm",
        lg: "h-12 gap-2 px-6",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
