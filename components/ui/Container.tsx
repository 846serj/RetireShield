import type { HTMLAttributes } from "react";

type ContainerProps = HTMLAttributes<HTMLDivElement> & { wide?: boolean };

export function Container({ className = "", wide = false, ...props }: ContainerProps) {
  const maxWidthClass = wide ? "max-w-wide" : "max-w-container";

  return <div className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${maxWidthClass} ${className}`} {...props} />;
}
