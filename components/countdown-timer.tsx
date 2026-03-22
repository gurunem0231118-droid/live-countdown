"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type TimerApiResponse = {
  target_time: string | null;
  is_active: boolean;
  background_color?: string | null;
  background_image_url?: string | null;
  text_color?: string | null;
  background_brightness?: number;
  background_transparency?: number;
};

type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const EMPTY_COUNTDOWN: CountdownState = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

function getRemainingTime(targetIso: string): CountdownState {
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const distance = Math.max(target - now, 0);

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);

  return { days, hours, minutes, seconds };
}

function formatUnit(value: number) {
  return value.toString().padStart(2, "0");
}

export default function CountdownTimer() {
  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [targetTime, setTargetTime] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<CountdownState>(EMPTY_COUNTDOWN);
  const [backgroundColor, setBackgroundColor] = useState("#020617");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [textColor, setTextColor] = useState("#f4f4f5");
  const [backgroundBrightness, setBackgroundBrightness] = useState(130);
  const [backgroundTransparency, setBackgroundTransparency] = useState(100);

  function applyThemeState(payload: TimerApiResponse) {
    setBackgroundColor(payload.background_color ?? "#020617");
    setBackgroundImageUrl(payload.background_image_url ?? null);
    setTextColor(payload.text_color ?? "#f4f4f5");
    setBackgroundBrightness(payload.background_brightness ?? 130);
    setBackgroundTransparency(payload.background_transparency ?? 100);
  }

  function applyTimerState(nextTargetTime: string | null, nextIsActive: boolean) {
    setTargetTime(nextTargetTime);
    setIsActive(nextIsActive);

    if (nextIsActive && nextTargetTime) {
      const nextRemaining = getRemainingTime(nextTargetTime);
      const endedNow =
        nextRemaining.days === 0 &&
        nextRemaining.hours === 0 &&
        nextRemaining.minutes === 0 &&
        nextRemaining.seconds === 0;

      setRemaining(nextRemaining);
      setHasEnded(endedNow);

      if (endedNow) {
        setIsActive(false);
      }
      return;
    }

    setRemaining(EMPTY_COUNTDOWN);
    setHasEnded(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function fetchTimerState() {
      try {
        const response = await fetch("/api/timer", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to fetch timer state");
        }

        const data = (await response.json()) as TimerApiResponse;

        if (!isMounted) {
          return;
        }

        applyTimerState(data.target_time, Boolean(data.is_active));
        applyThemeState(data);
      } catch {
        if (!isMounted) {
          return;
        }

        setIsActive(false);
        setTargetTime(null);
        setRemaining(EMPTY_COUNTDOWN);
        setHasEnded(false);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    const channel = supabase
      .channel("timer-state-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "timer_state",
          filter: "id=eq.1",
        },
        (payload) => {
          const updated = payload.new as TimerApiResponse;
          applyTimerState(updated.target_time, Boolean(updated.is_active));
          applyThemeState(updated);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          fetchTimerState();
        }
      });

    const poll = setInterval(() => {
      fetchTimerState();
    }, 3000);

    function onVisible() {
      if (document.visibilityState === "visible") {
        fetchTimerState();
      }
    }

    document.addEventListener("visibilitychange", onVisible);

    fetchTimerState();

    return () => {
      isMounted = false;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isActive || !targetTime) {
      return;
    }

    const interval = setInterval(() => {
      const next = getRemainingTime(targetTime);
      const ended =
        next.days === 0 &&
        next.hours === 0 &&
        next.minutes === 0 &&
        next.seconds === 0;

      setRemaining(next);

      if (ended) {
        setHasEnded(true);
        setIsActive(false);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isActive, targetTime]);

  const units = useMemo(
    () => [
      { label: "Days", value: formatUnit(remaining.days) },
      { label: "Hours", value: formatUnit(remaining.hours) },
      { label: "Minutes", value: formatUnit(remaining.minutes) },
      { label: "Seconds", value: formatUnit(remaining.seconds) },
    ],
    [remaining]
  );

  if (isLoading) {
    return (
      <section
        className="relative flex min-h-screen w-full items-center justify-center px-6 py-10"
        style={{ backgroundColor }}
      >
        <p className="text-center text-lg" style={{ color: textColor }}>
          Loading timer...
        </p>
      </section>
    );
  }

  if (!isActive) {
    return (
      <section
        className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-10"
        style={{
          backgroundColor,
          backgroundImage: backgroundImageUrl
            ? `url("${backgroundImageUrl}")`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: `brightness(${backgroundBrightness}%)`,
          opacity: backgroundTransparency / 100,
        }}
      >
        <p className="text-center text-3xl font-semibold tracking-wide sm:text-5xl" style={{ color: textColor }}>
          {hasEnded ? "Timer Ended" : "Waiting to Start"}
        </p>
      </section>
    );
  }

  return (
    <section
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-10"
      style={{
        backgroundColor,
        backgroundImage: backgroundImageUrl
          ? `url("${backgroundImageUrl}")`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: `brightness(${backgroundBrightness}%)`,
        opacity: backgroundTransparency / 100,
      }}
    >
      <div className="grid w-full max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        {units.map((unit) => (
          <article
            key={unit.label}
            className="rounded-2xl border border-zinc-700/70 bg-zinc-900/70 p-4 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_14px_30px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-6"
          >
            <p className="text-4xl font-black leading-none tracking-tight sm:text-6xl" style={{ color: textColor }}>
              {unit.value}
            </p>
            <p
              className="mt-3 text-xs font-medium tracking-[0.18em] uppercase sm:text-sm"
              style={{ color: textColor, opacity: 0.8 }}
            >
              {unit.label}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
