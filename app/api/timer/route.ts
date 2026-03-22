import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

type TimerPayload = {
  target_time?: string | null;
  is_active?: boolean;
  background_color?: string | null;
  background_image_url?: string | null;
  text_color?: string | null;
  background_brightness?: number;
  background_transparency?: number;
};

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const client = serviceKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, serviceKey, {
        auth: { persistSession: false },
      })
    : supabase;

  const { data, error } = await client
    .from("timer_state")
    .select("target_time,is_active,background_color,background_image_url,text_color,background_brightness,background_transparency")
    .eq("id", 1)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch timer state." },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 200 });
}

export async function POST(request: Request) {
  let payload: TimerPayload;

  try {
    payload = (await request.json()) as TimerPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { target_time, is_active, background_color, background_image_url, text_color, background_brightness, background_transparency } = payload;

  const hasStyleUpdate =
    background_color !== undefined ||
    background_image_url !== undefined ||
    text_color !== undefined ||
    background_brightness !== undefined ||
    background_transparency !== undefined;

  const hasTimerUpdate = target_time !== undefined || is_active !== undefined;

  if (!hasStyleUpdate && !hasTimerUpdate) {
    return NextResponse.json(
      { error: "Provide at least one field to update." },
      { status: 400 }
    );
  }

  if (is_active !== undefined && typeof is_active !== "boolean") {
    return NextResponse.json(
      { error: "Field is_active must be a boolean." },
      { status: 400 }
    );
  }

  if (is_active === true && !target_time) {
    return NextResponse.json(
      { error: "target_time is required when starting the timer." },
      { status: 400 }
    );
  }

  if (
    target_time !== undefined &&
    target_time !== null &&
    (typeof target_time !== "string" || Number.isNaN(new Date(target_time).getTime()))
  ) {
    return NextResponse.json(
      { error: "Field target_time must be a valid datetime string or null." },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, string | boolean | null | number> = {};

  if (target_time !== undefined) {
    updatePayload.target_time = target_time ?? null;
  }

  if (is_active !== undefined) {
    updatePayload.is_active = is_active;
  }

  if (background_color !== undefined) {
    updatePayload.background_color = background_color ?? null;
  }

  if (background_image_url !== undefined) {
    updatePayload.background_image_url = background_image_url ?? null;
  }

  if (text_color !== undefined) {
    updatePayload.text_color = text_color ?? null;
  }

  if (background_brightness !== undefined) {
    updatePayload.background_brightness = background_brightness;
  }

  if (background_transparency !== undefined) {
    updatePayload.background_transparency = background_transparency;
  }

  // Prefer using a server-side service role key for updates so RLS doesn't block.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment");
    return NextResponse.json(
      { error: "Server misconfigured: missing service role key." },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    serviceKey,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabaseAdmin
    .from("timer_state")
    .update(updatePayload)
    .eq("id", 1)
    .select("target_time,is_active,background_color,background_image_url,text_color,background_brightness,background_transparency")
    .single();

  if (error) {
    console.error("Supabase update error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to update timer state.", details: error },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 200 });
}
