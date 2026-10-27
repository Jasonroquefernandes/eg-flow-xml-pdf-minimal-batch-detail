import Link from "next/link"
import { CaretRight as ChevronRight } from "@phosphor-icons/react"

/** Brandsync Breadcrumb: last item is the current page (aria-current, not a link). */
function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="bs-breadcrumb">
        {items.map((item, i) => (
          <li key={item.label} className="bs-breadcrumb__item">
            {i > 0 && (
              <span className="bs-breadcrumb__separator" aria-hidden="true">
                <ChevronRight />
              </span>
            )}
            {item.href ? (
              <Link href={item.href} className="bs-breadcrumb__link">
                {item.label}
              </Link>
            ) : (
              <span className="bs-breadcrumb__current" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export { Breadcrumb }
