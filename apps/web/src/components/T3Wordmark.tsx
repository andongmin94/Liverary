import type { SVGProps } from "react";

export function T3Wordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="120" height="120" rx="30" fill="var(--color-ondam-canvas)" />
      <path
        d="M60 28C42.3 28 28 42.3 28 60V68C28 85.7 42.3 100 60 100V84C51.2 84 44 76.8 44 68V60C44 51.2 51.2 44 60 44Z"
        fill="var(--color-ondam-mint)"
      />
      <path
        d="M68 28C85.7 28 100 42.3 100 60V68C100 85.7 85.7 100 68 100V84C76.8 84 84 76.8 84 68V60C84 51.2 76.8 44 68 44Z"
        fill="var(--color-ondam-paper)"
      />
    </svg>
  );
}
