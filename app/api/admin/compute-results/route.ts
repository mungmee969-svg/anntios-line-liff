import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { requireAdmin } from "@/app/api/_lib/adminGuard";
import { pushLineTextSafe } from "@/app/api/_lib/lineMessaging";

type DrawBody = {
  lotteryName: string;
  twoTop: string;
  twoBottom: string;
  threeStraight: string;
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

function linePayout(rec: RecordRow, res: DrawBody): number {
  const num = (rec.number || "").trim();
  const ty = (rec.type || "").trim();
  const bt = (rec.bet_type || "").trim();
  const amt = Number(rec.amount);
  if (!Number.isFinite(amt) || amt <= 0) return 0;

  const twoTop = (res.twoTop || "").trim();
  const twoBottom = (res.twoBottom || "").trim();
  const three = (res.threeStraight || "").trim();
  const runTop = (res.runTop || "").trim().slice(-1);
  const runBottom = (res.runBottom || "").trim().slice(-1);

  if (bt === "2ตัว" || bt === "วิน2") {
    if (ty === "บน") return num === twoTop ? amt * PAYOUT_TWO : 0;
    if (ty === "ล่าง") return num === twoBottom ? amt * PAYOUT_TWO : 0;
    return 0;
  }

  if (bt === "3ตัว" || bt === "วิน3") {
    if (num.length !== 3 || three.length !== 3) return 0;
    if (ty === "ตรง") return num === three ? amt * PAYOUT_THREE_STRAIGHT : 0;
    if (ty === "โต๊ด") return sortedChars(num) === sortedChars(three) ? amt * PAYOUT_THREE_TODE : 0;
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

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = (await req.json()) as DrawBody;
    if (!body?.lotteryName?.trim()) {
      return NextResponse.json({ error: "lotteryName required" }, { status: 400 });
    }
    if (!body?.twoTop?.trim() || !body?.twoBottom?.trim() || !body?.threeStraight?.trim()) {
      return NextResponse.json(
        { error: "กรอก 2บน 2ล่าง และ 3ตัวตรง ให้ครบ" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: bills, error: bErr } = await supabase
      .from("bills")
      .select("*")
      .eq("lottery_name", body.lotteryName.trim())
      .in("status", ["pending", "accepted"]);

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 });

    const list = bills ?? [];
    let processed = 0;

    for (const bill of list) {
      const { data: records, error: rErr } = await supabase
        .from("records")
        .select("id,number,type,bet_type,amount")
        .eq("bill_id", bill.id);

      if (rErr) return NextResponse.json({ error: rErr.message }, { status: 400 });

      let prize = 0;
      for (const r of records ?? []) {
        const pay = linePayout(r as RecordRow, body);
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
        if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });
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

      if (wErr) return NextResponse.json({ error: wErr.message }, { status: 400 });

      const creditBefore = Number(w?.credit_balance ?? 0);
      let creditAfter = creditBefore;

      if (prize > 0) {
        creditAfter = creditBefore + prize;
        const { error: upW } = await supabase
          .from("user_wallets")
          .update({ credit_balance: creditAfter, updated_at: new Date().toISOString() })
          .eq("user_id", bill.user_id);
        if (upW) return NextResponse.json({ error: upW.message }, { status: 400 });

        const { error: txErr } = await supabase.from("wallet_transactions").insert({
          user_id: bill.user_id,
          display_name: bill.display_name ?? w?.display_name ?? null,
          type: "win_credit",
          amount: prize,
          balance_before: creditBefore,
          balance_after: creditAfter,
          status: "approved",
          note: String(bill.bill_no ?? ""),
          approved_by: admin.userId,
          approved_at: new Date().toISOString(),
        });
        if (txErr) return NextResponse.json({ error: txErr.message }, { status: 400 });
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

      if (billErr) return NextResponse.json({ error: billErr.message }, { status: 400 });

      const fmt = (n: number) =>
        new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
      await pushLineTextSafe({
        to: bill.user_id,
        text: `ตรวจผลบิล ${bill.bill_no}\nรางวัลรวม ${fmt(prize)} บ.\nสุทธิ ${fmt(net)} บ.\nเครดิตหลังอัปเดต ${fmt(creditAfter)} บ.`,
      });

      processed += 1;
    }

    return NextResponse.json({ ok: true, processed, lotteryName: body.lotteryName.trim() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    const status = msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
