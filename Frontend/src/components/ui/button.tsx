import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default:  "bg-brand-500 text-white hover:bg-brand-600 shadow-sm hover:shadow-brand-500/30 hover:shadow-md hover:-translate-y-0.5",
        outline:  "border border-border bg-transparent text-gray-900 hover:bg-brand-50 hover:border-brand-200",
        ghost:    "text-gray-600 hover:bg-brand-50 hover:text-brand-600",
        link:     "text-brand-500 underline-offset-4 hover:underline",
      },
      size: {
        sm:      "h-8  px-3 text-xs",
        default: "h-10 px-5 text-sm",
        lg:      "h-12 px-7 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";
export { Button, buttonVariants };
