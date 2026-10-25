import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** 1280px max content width with a 24px gutter (16px on phones). */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1280px] px-6 max-md:px-4", className)} {...props} />;
}
