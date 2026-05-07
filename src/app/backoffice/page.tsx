import { redirect } from "next/navigation";
import { getBackofficeSession } from "@/app/api/backoffice/_lib/session";

export default async function BackofficeIndex() {
  const session = await getBackofficeSession();
  if (!session) redirect("/backoffice/login");
  redirect("/backoffice/dashboard");
}

