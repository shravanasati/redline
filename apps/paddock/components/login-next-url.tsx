"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface LoginWithNextURLProps {
  children: ReactNode;
  loginURL: string;
}

export function LoginWithNextURL({
  loginURL = "/login",
  children,
}: LoginWithNextURLProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = searchParams.toString();
  // Encode the entire URL as a single value
  const fullPath = `${pathname}${params ? `?${params}` : ""}`;
  const nextURL = encodeURIComponent(fullPath);

  return (
    <Button variant="link" asChild className="w-full sm:w-auto">
      <Link href={`${loginURL}?next=${nextURL}`}>{children}</Link>
    </Button>
  );
}
