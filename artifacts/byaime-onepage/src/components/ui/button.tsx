import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "outline" | "ghost" | "link" | "pill" | "glass"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Minimal classes based on variant/size
    const baseClasses = "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    
    const variants = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md",
      ghost: "hover:bg-accent hover:text-accent-foreground rounded-md",
      link: "text-primary underline-offset-4 hover:underline",
      pill: "bg-foreground text-background rounded-full hover:bg-foreground/90 font-medium px-6 py-2",
      glass: "glass-panel text-white rounded-full hover:bg-white/10"
    }
    
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    }

    return (
      <Comp
        className={cn(baseClasses, variants[variant], variant !== 'pill' && variant !== 'glass' && sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
