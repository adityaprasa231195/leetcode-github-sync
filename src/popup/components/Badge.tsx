

import type { ReactNode } from "react"

type Variant = "success" | "error" | "warning" | "neutral"

const VARIANT_CLASSES: Record<Variant, string> = {
  success: "bg-black text-white",
  error: "bg-black text-white border border-black",
  warning: "bg-white text-black border border-black",
  neutral: "bg-brand-100 text-brand-700 border border-brand-200"
}

export function Badge({
  variant = "neutral",
  children
}: {
  variant?: Variant
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  )
}
