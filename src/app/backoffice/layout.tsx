import { BackofficeGuard } from "@/src/components/backoffice/BackofficeGuard";
import { BackofficeShell } from "@/src/components/backoffice/BackofficeShell";

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <BackofficeGuard>
      <BackofficeShell>{children}</BackofficeShell>
    </BackofficeGuard>
  );
}

