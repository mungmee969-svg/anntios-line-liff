import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/app/api/_lib/supabaseAdmin";
import { verifyLiffIdToken } from "@/app/api/_lib/lineAuth";

type Body = {
  filename: string;
  contentType?: string;
};

export async function POST(req: NextRequest) {
  try {
    const user = await verifyLiffIdToken(req);
    const body = (await req.json()) as Body;
    const filename = body.filename?.trim();
    if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const bucket = "payment-slips";
    const ext = filename.includes(".") ? filename.split(".").pop() : "jpg";
    const path = `${user.userId}/${Date.now()}.${ext}`;

    // If bucket missing, return friendly error
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json(
        {
          error:
            "ยังไม่พร้อมใช้งานการอัปโหลดสลิป กรุณาลองใหม่หรือแจ้งแอดมิน",
          detail: error?.message ?? "createSignedUploadUrl failed",
        },
        { status: 400 },
      );
    }

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

    return NextResponse.json({
      bucket,
      path,
      uploadUrl: data.signedUrl,
      token: data.token,
      publicUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

