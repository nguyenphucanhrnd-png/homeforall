import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Primary = orange + ink text (never white on orange). Secondary = blue + white.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-center font-bold whitespace-normal no-underline sm:whitespace-nowrap transition-[transform,box-shadow,background-color] duration-200 ease-out cursor-pointer active:scale-[0.98] active:duration-75 disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-orange-500 text-ink shadow-soft hover:shadow-lift hover:-translate-y-px active:translate-y-0",
        secondary: "bg-blue-600 text-white shadow-soft hover:bg-blue-800 hover:shadow-lift",
        ghost: "bg-transparent text-blue-600 hover:bg-blue-100 hover:text-blue-800", // blue-600 on blue-100 is only 4.30:1
        emergency: "border-2 border-danger bg-white text-danger hover:bg-cream-50",
      },
      size: {
        sm: "min-h-10 px-4 text-sm",
        md: "min-h-12 px-6 text-base",
        lg: "min-h-14 px-8 text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
