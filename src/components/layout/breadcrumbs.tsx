import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

type Crumb = { href?: string; label: string };

export function Breadcrumbs({ items, label }: { items: Crumb[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-1 text-sm font-semibold">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight aria-hidden="true" className="size-4 text-muted" />}
            {item.href ? (
              <Link href={item.href} className="max-md:inline-flex max-md:min-h-11 max-md:min-w-11 max-md:items-center">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-muted">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
