import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type BaseProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
};

type ButtonAsButton = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type ButtonAsLink = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark border-brand",
  secondary: "bg-white text-brand border-brand hover:bg-band",
  ghost: "bg-transparent text-brand border-transparent hover:bg-band hover:text-brand-dark",
};

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
  const classes = `inline-flex min-h-14 items-center justify-center rounded-xl border-2 px-6 py-3 text-lg font-bold leading-snug no-underline transition-colors ${variants[variant]} ${className}`;

  if ("href" in props && props.href) {
    return (
      <Link className={classes} {...props} href={props.href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
