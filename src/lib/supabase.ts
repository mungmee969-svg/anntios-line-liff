import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type RecordType = "บน" | "ล่าง" | "ตรง" | "โต๊ด";

export type LotteryName =
  | "รัฐบาลไทย"
  | "ลาวพัฒนา"
  | "ฮานอย"
  | "ฮานอย VIP"
  | "ฮานอยพัฒนา";

export type BetType =
  | "2ตัว"
  | "3ตัว"
  | "6กลับ"
  | "19ประตู"
  | "วิ่ง"
  | "วิน2"
  | "วิน3";

const SUPABASE_URL = "https://ppeprvsejhtffodikclr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LCPec3vZVPz9rxlxCGKamQ_U84AZtF-";

export type RecordRow = {
  id: string;
  user_id: string;
  number: string;
  type: RecordType;
  lottery_name: string | null;
  bet_type: string | null;
  amount: number;
  note: string | null;
  created_at: string;
};

export type SaveRecordInput = {
  userId: string;
  number: string;
  type: RecordType;
  lotteryName: LotteryName;
  betType: BetType;
  amount: number;
  note?: string;
};

export type SaveRecordsInput = {
  userId: string;
  lotteryName: LotteryName;
  betType: BetType;
  note?: string;
  items: Array<{
    number: string;
    type: RecordType;
    amount: number;
  }>;
};

function getEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL") ?? SUPABASE_URL;
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? SUPABASE_ANON_KEY;

  _client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export async function saveRecord(input: SaveRecordInput): Promise<RecordRow> {
  const supabase = getSupabaseClient();

  const number = input.number.trim();
  if (!number) throw new Error("กรุณากรอกเลข");
  if (!input.lotteryName?.trim()) throw new Error("กรุณาเลือกชื่อหวย");
  if (!input.betType?.trim()) throw new Error("กรุณาเลือกประเภทเดิมพัน");
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    throw new Error("กรุณากรอกจำนวนเงินที่ถูกต้อง");

  const { data, error } = await supabase
    .from("records")
    .insert({
      user_id: input.userId,
      number,
      type: input.type,
      lottery_name: input.lotteryName,
      bet_type: input.betType,
      amount: input.amount,
      note: input.note?.trim() ? input.note.trim() : null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as RecordRow;
}

export async function saveRecords(input: SaveRecordsInput): Promise<RecordRow[]> {
  const supabase = getSupabaseClient();

  if (!input.userId?.trim()) throw new Error("ยังไม่ได้เข้าสู่ระบบ LINE");
  if (!input.lotteryName?.trim()) throw new Error("กรุณาเลือกชื่อหวย");
  if (!input.betType?.trim()) throw new Error("กรุณาเลือกประเภทเดิมพัน");
  if (!Array.isArray(input.items) || input.items.length === 0)
    throw new Error("ยังไม่มีรายการ");

  const rows = input.items.map((it) => {
    const number = it.number.trim();
    if (!number) throw new Error("กรุณากรอกเลข");
    if (!Number.isFinite(it.amount) || it.amount <= 0)
      throw new Error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
    return {
      user_id: input.userId,
      lottery_name: input.lotteryName,
      bet_type: input.betType,
      number,
      type: it.type,
      amount: it.amount,
      note: input.note?.trim() ? input.note.trim() : null,
    };
  });

  const { data, error } = await supabase.from("records").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as RecordRow[];
}

export async function getRecords(userId: string): Promise<RecordRow[]> {
  const supabase = getSupabaseClient();
  const uid = userId.trim();
  if (!uid) return [];

  const { data, error } = await supabase
    .from("records")
    .select("id,user_id,number,type,lottery_name,bet_type,amount,note,created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as RecordRow[];
}

