import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
      return NextResponse.json(
        { error: "Server misconfigured: missing service role key" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      serviceKey,
      { auth: { persistSession: false } }
    );

    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `bg-${timestamp}.${ext}`;

    const buffer = await file.arrayBuffer();

    const { error } = await supabaseAdmin.storage
      .from("timer-backgrounds")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to upload image" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("timer-backgrounds")
      .getPublicUrl(filename);

    return NextResponse.json(
      { publicUrl: urlData.publicUrl, filename },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
