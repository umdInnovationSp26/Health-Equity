import * as React from "react";
import Link from "next/link";

/**
 * Standard button styling for the app. Matches the main-page action buttons:
 * softly-rounded (rounded-xl), semibold white text on a solid fill, subtle
 * shadow and hover lift.
 *
 * Variants:
 *  - primary   → dark blue (default; use for most actions)
 *  - success   → green (Google Sheets, produce/harvest, confirmations)
 *  - danger    → red (destructive actions like delete)
 *  - secondary → light slate (cancel / dismiss / low-emphasis)
 */
export type ButtonVariant = "primary" | "success" | "danger" | "secondary";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  success: "bg-green-600 text-white hover:bg-green-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold shadow-sm transition hover:scale-[1.02] hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100";

/**
 * Returns the standard button classes. Use this to style elements that can't be
 * a <button> (e.g. a Next.js <Link> or an <a>) so they still match.
 */
export function buttonClasses(variant: ButtonVariant = "primary", className = "") {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`.trim();
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/** Standard app button. Defaults to type="button" so it won't submit forms unless asked. */
export default function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}

export interface ButtonLinkProps
  extends React.ComponentProps<typeof Link> {
  variant?: ButtonVariant;
}

/** A Next.js <Link> styled as a standard button (for navigation actions). */
export function ButtonLink({ variant = "primary", className = "", ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
