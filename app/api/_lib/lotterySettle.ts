import type { SupabaseClient } from "@supabase/supabase-js";
import { pushLineTextSafe } from "@/app/api/_lib/lineMessaging";

export type LotteryDrawInput = {
  lotteryName: string;
  twoTop: string;
  twoBottom: string;
  threeStraight: string;
  /** ผล 3 ตัวบน — ถ้าไม่ส่ง ใช้ threeStraight แทน (เข้ากับฟอร์มเดิม) */
  threeTop?: string;
  /** ผล 3 ตัวโต๊ด — ใช้เปรียบเทียบโต๊ด (ถ้าไม่ส่ง ใช้ threeStraight สำหรับโต๊ด) */
  threeTode?: string;
  runTop?: string;
  runBottom?: string;
};

type RecordRow = {
  id: string;
  number: string;
  type: string | null;
  bet_type: string | null;
  amount: number | string | null;
};

const PAYOUT_TWO = 70;
const PAYOUT_THREE_STRAIGHT = 500;
const PAYOUT_THREE_TODE = 120;
const PAYOUT_RUN = 4;

function sortedChars(s: string) {
  return s.split("").sort().join("");
}

/** ใช้ threeStraight เป็นเลขอ้างอิง 3 ตัวบน และโต๊ด ถ้าไม่ส่ง threeTop/threeTode */
export function linePayout(rec: RecordRow, res: LotteryDrawInput): number {
  const num = (rec.number || "").trim();
  const ty = (rec.type || "").trim();
  const bt = (rec.bet_type || "").trim();
  const amt = Number(rec.amount);
  if (!Number.isFinite(amt) || amt <= 0) return 0;

  const twoTop = (res.twoTop || "").trim();
  const twoBottom = (res.twoBottom || "").trim();
  const threeTop = (res.threeTop ?? (res.threeStraight || "")).trim();
  const threeTode = (res.threeTode ?? (res.threeStraight || "")).trim();
  const runTop = (res.runTop || "").trim().slice(-1);
  const runBottom = (res.runBottom || "").trim().slice(-1);

  if (bt === "2ตัว" || bt === "วิน2") {
    if (ty === "บน") return num === twoTop ? amt * PAYOUT_TWO : 0;
    if (ty === "ล่าง") return num === twoBottom ? amt * PAYOUT_TWO : 0;
    return 0;
  }

  if (bt === "3ตัว" || bt === "วิน3") {
    if (num.length !== 3 || threeTop.length !== 3) return 0;
    if (ty === "ตรง") return num === threeTop ? amt * PAYOUT_THREE_STRAIGHT : 0;
    if (ty === "โต๊ด")
      return threeTode.length === 3 && sortedChars(num) === sortedChars(threeTode)
        ? amt * PAYOUT_THREE_TODE
        : 0;
    return 0;
  }

  if (bt === "วิ่ง") {
    if (num.length !== 1) return 0;
    if (ty === "บน" && runTop) return num === runTop ? amt * PAYOUT_RUN : 0;
    if (ty === "ล่าง" && runBottom) return num === runBottom ? amt * PAYOUT_RUN : 0;
    return 0;
  }

  return 0;
}

export type SettlePreviewWinner = {
  userId: string;
  displayName: string | null;
  billNo: string;
  billId: string;
  prize: number;
};

export type SettlePreview = {
  billCount: number;
  totalStake: number;
  totalPrize: number;
  net: number;
  winners: SettlePreviewWinner[];
};

export async function previewLotterySettle(
  supabase: SupabaseClient,
  draw: LotteryDrawInput,
): Promise<SettlePreview> {
  const { data: bills, error } = await supabase
    .from("bills")
    .select("id,bill_no,user_id,display_name,total_amount")
    .eq("lottery_name", draw.lotteryName.trim())
    .in("status", ["pending", "accepted"]);

  if (error) throw new Error(error.message);
  const list = bills ?? [];

  let totalStake = 0;
  let totalPrize = 0;
  const winners: SettlePreviewWinner[] = [];

  for (const bill of list) {
    const { data: records, error: rErr } = await supabase
      .from("records")
      .select("id,number,type,bet_type,amount")
      .eq("bill_id", bill.id);
    if (rErr) throw new Error(rErr.message);

    let prize = 0;
    for (const r of records ?? []) {
      prize += linePayout(r as RecordRow, draw);
    }
    const stake = Number(bill.total_amount ?? 0);
    totalStake += stake;
    totalPrize += prize;
    if (prize > 0) {
      winners.push({
        userId: bill.user_id,
        displayName: bill.display_name,
        billNo: String(bill.bill_no ?? ""),
        billId: bill.id,
        prize,
      });
    }
  }

  return {
    billCount: list.length,
    totalStake,
    totalPrize,
    net: totalPrize - totalStake,
    winners,
  };
}

export async function settleLotteryBills(
  supabase: SupabaseClient,
  draw: LotteryDrawInput,
  approvedByUserId: string,
): Promise<{ processed: number }> {
  const { data: bills, error: bErr } = await supabase
    .from("bills")
    .select("*")
    .eq("lottery_name", draw.lotteryName.trim())
    .in("status", ["pending", "accepted"]);

  if (bErr) throw new Error(bErr.message);
  const list = bills ?? [];
  let processed = 0;

  for (const bill of list) {
    await settleOneBill(supabase, bill, draw, approvedByUserId);
    processed += 1;
  }

  return { processed };
}

type BillRow = Record<string, unknown> & {
  id: string;
  user_id: string;
  display_name: string | null;
  bill_no: string | null;
  total_amount: number | string | null;
};

export async function settleSingleBillById(
  supabase: SupabaseClient,
  billId: string,
  draw: LotteryDrawInput,
  approvedByUserId: string,
): Promise<void> {
  const { data: bill, error } = await supabase.from("bills").select("*").eq("id", billId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!bill) throw new Error("bill not found");
  const st = String(bill.status);
  if (st !== "pending" && st !== "accepted") throw new Error("bill not open for settle");
  if (String(bill.lottery_name ?? "").trim() !== draw.lotteryName.trim()) {
    throw new Error("lottery mismatch");
  }
  await settleOneBill(supabase, bill as BillRow, draw, approvedByUserId);
}

async function settleOneBill(
  supabase: SupabaseClient,
  bill: BillRow,
  draw: LotteryDrawInput,
  approvedByUserId: string,
) {
  const { data: records, error: rErr } = await supabase
    .from("records")
    .select("id,number,type,bet_type,amount")
    .eq("bill_id", bill.id);

  if (rErr) throw new Error(rErr.message);

  let prize = 0;
  for (const r of records ?? []) {
    const pay = linePayout(r as RecordRow, draw);
    prize += pay;
    const isWin = pay > 0;
    const lose = isWin ? 0 : Number(r.amount ?? 0);
    const { error: uErr } = await supabase
      .from("records")
      .update({
        result_status: isWin ? "win" : "lose",
        win_amount: pay,
        lose_amount: lose,
      })
      .eq("id", r.id);
    if (uErr) throw new Error(uErr.message);
  }

  const totalStake = Number(bill.total_amount ?? 0);
  const billLoseAgg = Math.max(0, totalStake - prize);
  const net = prize - totalStake;

  await supabase.rpc("_get_or_create_wallet", {
    p_user_id: bill.user_id,
    p_display_name: bill.display_name ?? null,
  });

  const { data: w, error: wErr } = await supabase
    .from("user_wallets")
    .select("id,credit_balance,display_name")
    .eq("user_id", bill.user_id)
    .maybeSingle();

  if (wErr) throw new Error(wErr.message);

  const creditBefore = Number(w?.credit_balance ?? 0);
  let creditAfter = creditBefore;

  if (prize > 0) {
    creditAfter = creditBefore + prize;
    const { error: upW } = await supabase
      .from("user_wallets")
      .update({ credit_balance: creditAfter, updated_at: new Date().toISOString() })
      .eq("user_id", bill.user_id);
    if (upW) throw new Error(upW.message);

    const { error: txErr } = await supabase.from("wallet_transactions").insert({
      user_id: bill.user_id,
      display_name: bill.display_name ?? w?.display_name ?? null,
      type: "win_credit",
      amount: prize,
      balance_before: creditBefore,
      balance_after: creditAfter,
      status: "approved",
      note: String(bill.bill_no ?? ""),
      approved_by: approvedByUserId,
      approved_at: new Date().toISOString(),
    });
    if (txErr) throw new Error(txErr.message);
  }

  const { error: billErr } = await supabase
    .from("bills")
    .update({
      status: "settled",
      win_amount: prize,
      lose_amount: billLoseAgg,
      net_amount: net,
      settled_at: new Date().toISOString(),
      credit_before: creditBefore,
      credit_after: creditAfter,
    })
    .eq("id", bill.id);

  if (billErr) throw new Error(billErr.message);

  const fmt = (n: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
  await pushLineTextSafe({
    to: bill.user_id,
    text: `ตรวจผลบิล ${bill.bill_no}\nรางวัลรวม ${fmt(prize)} บ.\nสุทธิ ${fmt(net)} บ.\nเครดิตหลังอัปเดต ${fmt(creditAfter)} บ.`,
  });
}
