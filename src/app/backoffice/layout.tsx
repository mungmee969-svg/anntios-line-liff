"use client";

import { usePathname } from "next/navigation";
import { BackofficeGuard } from "@/src/components/backoffice/BackofficeGuard";
import { BackofficeShell } from "@/src/components/backoffice/BackofficeShell";

export default function BackofficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/backoffice/login") {
    return <>{children}</>;
  }

  return (
    <BackofficeGuard>
      <BackofficeShell>{children}</BackofficeShell>
    </BackofficeGuard>
  );
}

