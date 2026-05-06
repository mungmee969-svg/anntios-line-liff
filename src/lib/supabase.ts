import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type RecordType = "2 ตัว" | "3 ตัว" | "วิ่ง";

export type RecordRow = {
  id: string;
  user_id: string;
  number: string;
  type: RecordType;
  amount: number;
  note: string | null;
  created_at: string;
};

export type SaveRecordInput = {
  userId: string;
  number: string;
  type: RecordType;
  amount: number;
  note?: string;
};

function getEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  _client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export async function saveRecord(input: SaveRecordInput): Promise<RecordRow> {
  const supabase = getSupabaseClient();

  const number = input.number.trim();
  if (!number) throw new Error("กรุณากรอกเลข");
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    throw new Error("กรุณากรอกจำนวนเงินที่ถูกต้อง");

  const { data, error } = await supabase
    .from("records")
    .insert({
      user_id: input.userId,
      number,
      type: input.type,
      amount: input.amount,
      note: input.note?.trim() ? input.note.trim() : null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as RecordRow;
}

export async function getRecords(userId: string): Promise<RecordRow[]> {
  const supabase = getSupabaseClient();
  const uid = userId.trim();
  if (!uid) return [];

  const { data, error } = await supabase
    .from("records")
    .select("id,user_id,number,type,amount,note,created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as RecordRow[];
}

