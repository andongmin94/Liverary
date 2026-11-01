import type { SVGProps } from "react";

export function T3Wordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="120" height="120" rx="30" fill="var(--color-liverary-brand)" />
      <path
        d="M26 35C39 31 51 34 60 42V94C51 87 39 84 26 88V35Z"
        fill="var(--color-liverary-paper)"
      />
      <path
        d="M68 42C77 34 89 31 102 35V88C89 84 77 87 68 94V42Z"
        fill="var(--color-liverary-page)"
      />
    </svg>
  );
}
