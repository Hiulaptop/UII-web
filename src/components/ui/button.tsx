import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent font-heading text-base font-normal tracking-[-0.02em] whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-graphite text-white hover:bg-steel",
        outline: "border-graphite bg-transparent text-graphite hover:bg-ash",
        secondary: "bg-ash text-graphite hover:bg-mist",
        ghost: "text-graphite hover:bg-ash",
        link: "text-graphite underline decoration-ember-orange decoration-1 underline-offset-[3px]",
      },
      size: {
        default: "h-11 gap-2 px-5",
        sm: "h-9 gap-1.5 px-4 text-sm",
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
