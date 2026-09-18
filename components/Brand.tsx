import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Nara MD home">
      <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" /><path d="M5 17h5l2-6 3 12 3-15 2 9h7" /></svg>
      Nara<sup>MD</sup>
    </Link>
  );
}
