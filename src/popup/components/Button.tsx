/** Reusable button component — black/white minimalist style. */

import type { ButtonHTMLAttributes, ReactNode } from "react"
import { Spinner } from "./Spinner"

type Variant = "primary" | "secondary" | "ghost" | "danger"

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:pointer-events-none disabled:opacity-50"

const VARIANTS: Record<Variant, string> = {
  primary: "bg-black text-white hover:bg-brand-800 active:bg-brand-900",
  secondary:
    "bg-white text-black border border-brand-300 hover:bg-brand-50 active:bg-brand-100",
  ghost: "bg-transparent text-brand-700 hover:bg-brand-100 active:bg-brand-200",
  danger:
    "bg-white text-black border border-brand-300 hover:border-black hover:bg-brand-50"
}

const SIZES: Record<string, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-4",
  lg: "h-11 px-6 text-base"
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: "sm" | "md" | "lg"
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}
