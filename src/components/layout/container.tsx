import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** 1280px max content width with a 24px gutter (prompt §8). */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1280px] px-6", className)} {...props} />;
}
