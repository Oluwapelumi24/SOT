"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children, exact = false, className = "nav" }: { href: string; children: React.ReactNode; exact?: boolean; className?: string }) {
  const path = usePathname();
  const on = exact ? path === href : path === href || path.startsWith(href + "/");
  return <Link href={href} className={`${className} ${on ? "on" : ""}`}>{children}</Link>;
}
