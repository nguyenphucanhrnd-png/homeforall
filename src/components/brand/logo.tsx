import Image from "next/image";
import { cn } from "@/lib/utils";
import logoFull from "../../../public/brand/logo.png";
import logoMark from "../../../public/brand/logo-mark.png";
import logoWordmark from "../../../public/brand/logo-wordmark.png";

// Official artwork (public/brand/logo-source.png), cut out by
// scripts/brand/make-logo-assets.py. All variants are transparent and work on
// cream, white and navy.

/** Header lockup: the mark carries the name; the wordmark repeats it visually, so its alt stays empty. */
export function LogoLockup({ className, priority, alt = "HomeForAll" }: { className?: string; priority?: boolean; alt?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center gap-1.5", className)}>
      <Image src={logoMark} alt={alt} priority={priority} className="h-11 w-auto" sizes="44px" />
      <Image src={logoWordmark} alt="" priority={priority} className="h-6 w-auto" sizes="130px" />
    </span>
  );
}

/** Stacked logo (mark above wordmark), e.g. footer and about page. */
export function LogoFull({ className, alt = "HomeForAll" }: { className?: string; alt?: string }) {
  return <Image src={logoFull} alt={alt} className={cn("h-auto w-32", className)} sizes="128px" />;
}
