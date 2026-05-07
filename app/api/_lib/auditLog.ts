import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditLogInput = {
  actorUserId: string;
  actorName: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function insertAuditLog(
  supabase: SupabaseClient,
  input: AuditLogInput,
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: input.actorUserId,
    actor_name: input.actorName,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) console.error("[audit_logs]", error.message);
}
