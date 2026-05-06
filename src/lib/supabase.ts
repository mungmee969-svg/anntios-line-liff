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
  bill_id: string | null;
  amount: number;
  note: string | null;
  created_at: string;
};

export type BillStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "settled"
  | "cancelled";

export type BillRow = {
  id: string;
  bill_no: string;
  user_id: string;
  display_name: string | null;
  lottery_name: string | null;
  bet_type: string | null;
  total_amount: number;
  win_amount: number;
  lose_amount: number;
  net_amount: number;
  status: BillStatus;
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

export type CreateBillInput = {
  billNo: string;
  userId: string;
  displayName?: string;
  lotteryName: LotteryName;
  betType: BetType;
  note?: string;
  totalAmount: number;
};

export type CreateBillWithRecordsInput = {
  billNo: string;
  userId: string;
  displayName?: string;
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
      bill_id: null,
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
      bill_id: null,
      amount: it.amount,
      note: input.note?.trim() ? input.note.trim() : null,
    };
  });

  const { data, error } = await supabase.from("records").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as RecordRow[];
}

export async function createBill(input: CreateBillInput): Promise<BillRow> {
  const supabase = getSupabaseClient();
  if (!input.billNo?.trim()) throw new Error("billNo is required");
  if (!input.userId?.trim()) throw new Error("userId is required");
  if (!input.lotteryName?.trim()) throw new Error("กรุณาเลือกชื่อหวย");
  if (!input.betType?.trim()) throw new Error("กรุณาเลือกประเภทเดิมพัน");
  if (!Number.isFinite(input.totalAmount) || input.totalAmount < 0)
    throw new Error("totalAmount invalid");

  const { data, error } = await supabase
    .from("bills")
    .insert({
      bill_no: input.billNo,
      user_id: input.userId,
      display_name: input.displayName ?? null,
      lottery_name: input.lotteryName,
      bet_type: input.betType,
      total_amount: input.totalAmount,
      status: "pending",
      note: input.note?.trim() ? input.note.trim() : null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as BillRow;
}

export async function createBillWithRecords(
  input: CreateBillWithRecordsInput,
): Promise<{ bill: BillRow; records: RecordRow[] }> {
  const supabase = getSupabaseClient();
  if (!input.userId?.trim()) throw new Error("ยังไม่ได้เข้าสู่ระบบ LINE");
  if (!input.billNo?.trim()) throw new Error("billNo is required");
  if (!input.lotteryName?.trim()) throw new Error("กรุณาเลือกชื่อหวย");
  if (!input.betType?.trim()) throw new Error("กรุณาเลือกประเภทเดิมพัน");
  if (!Array.isArray(input.items) || input.items.length === 0)
    throw new Error("ยังไม่มีรายการ");

  const totalAmount = input.items.reduce((sum, it) => sum + it.amount, 0);
  const bill = await createBill({
    billNo: input.billNo,
    userId: input.userId,
    displayName: input.displayName,
    lotteryName: input.lotteryName,
    betType: input.betType,
    note: input.note,
    totalAmount,
  });

  const rows = input.items.map((it) => {
    const number = it.number.trim();
    if (!number) throw new Error("กรุณากรอกเลข");
    if (!Number.isFinite(it.amount) || it.amount <= 0)
      throw new Error("กรุณากรอกจำนวนเงินที่ถูกต้อง");
    return {
      bill_id: bill.id,
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
  return { bill, records: (data ?? []) as RecordRow[] };
}

export async function getBills(userId: string): Promise<BillRow[]> {
  const supabase = getSupabaseClient();
  const uid = userId.trim();
  if (!uid) return [];

  const { data, error } = await supabase
    .from("bills")
    .select(
      "id,bill_no,user_id,display_name,lottery_name,bet_type,total_amount,win_amount,lose_amount,net_amount,status,note,created_at",
    )
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as BillRow[];
}

export async function getBill(billId: string): Promise<BillRow | null> {
  const supabase = getSupabaseClient();
  const id = billId.trim();
  if (!id) return null;
  const { data, error } = await supabase
    .from("bills")
    .select(
      "id,bill_no,user_id,display_name,lottery_name,bet_type,total_amount,win_amount,lose_amount,net_amount,status,note,created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as BillRow | null;
}

export async function getBillRecords(billId: string): Promise<RecordRow[]> {
  const supabase = getSupabaseClient();
  const id = billId.trim();
  if (!id) return [];
  const { data, error } = await supabase
    .from("records")
    .select("id,user_id,number,type,lottery_name,bet_type,bill_id,amount,note,created_at")
    .eq("bill_id", id)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as RecordRow[];
}

export type UserWalletRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  credit_balance: number;
  created_at: string;
  updated_at: string;
};

export type WalletTransactionType =
  | "deposit"
  | "bet_hold"
  | "bet_settle"
  | "refund"
  | "adjust";

export type WalletTransactionStatus = "pending" | "approved" | "rejected";

export type WalletTransactionRow = {
  id: string;
  user_id: string;
  type: WalletTransactionType;
  amount: number;
  balance_after: number | null;
  status: WalletTransactionStatus;
  slip_url: string | null;
  note: string | null;
  created_at: string;
};

export async function getOrCreateWallet(params: {
  userId: string;
  displayName?: string;
}): Promise<UserWalletRow> {
  const supabase = getSupabaseClient();
  const uid = params.userId.trim();
  if (!uid) throw new Error("ยังไม่ได้เข้าสู่ระบบ LINE");

  const { data: existing, error: existingError } = await supabase
    .from("user_wallets")
    .select("id,user_id,display_name,credit_balance,created_at,updated_at")
    .eq("user_id", uid)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing as UserWalletRow;

  const { data, error } = await supabase
    .from("user_wallets")
    .insert({
      user_id: uid,
      display_name: params.displayName ?? null,
      credit_balance: 0,
    })
    .select("id,user_id,display_name,credit_balance,created_at,updated_at")
    .single();
  if (error) throw new Error(error.message);
  return data as UserWalletRow;
}

export async function getWalletTransactions(userId: string): Promise<WalletTransactionRow[]> {
  const supabase = getSupabaseClient();
  const uid = userId.trim();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("id,user_id,type,amount,balance_after,status,slip_url,note,created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as WalletTransactionRow[];
}

export async function createDepositRequest(input: {
  userId: string;
  amount: number;
  note?: string;
}): Promise<WalletTransactionRow> {
  const supabase = getSupabaseClient();
  const uid = input.userId.trim();
  if (!uid) throw new Error("ยังไม่ได้เข้าสู่ระบบ LINE");
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    throw new Error("กรุณากรอกจำนวนเงินที่ถูกต้อง");

  const { data, error } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: uid,
      type: "deposit",
      amount: input.amount,
      status: "pending",
      note: input.note?.trim() ? input.note.trim() : null,
    })
    .select("id,user_id,type,amount,balance_after,status,slip_url,note,created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as WalletTransactionRow;
}

export async function getRecords(userId: string): Promise<RecordRow[]> {
  const supabase = getSupabaseClient();
  const uid = userId.trim();
  if (!uid) return [];

  const { data, error } = await supabase
    .from("records")
    .select("id,user_id,number,type,lottery_name,bet_type,bill_id,amount,note,created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as RecordRow[];
}

