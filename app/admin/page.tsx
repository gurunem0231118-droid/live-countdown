"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type TimerResponse = {
  target_time: string | null;
  is_active: boolean;
  background_color?: string | null;
  background_image_url?: string | null;
  text_color?: string | null;
  error?: string;
};

export default function AdminPage() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [backgroundColor, setBackgroundColor] = useState("#020617");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [backgroundImageFileName, setBackgroundImageFileName] = useState("");
  const [textColor, setTextColor] = useState("#f4f4f5");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("adminAuthenticated");
      setIsAuthenticated(v === "true");
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function loadCurrentSettings() {
      try {
        const response = await fetch("/api/timer", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as TimerResponse;
        setBackgroundColor(data.background_color ?? "#020617");
        setBackgroundImageUrl(data.background_image_url ?? "");
        setTextColor(data.text_color ?? "#f4f4f5");
      } catch {
        // no-op: keep defaults
      }
    }

    loadCurrentSettings();
  }, [isAuthenticated]);

  async function updateTimer(payload: {
    target_time?: string | null;
    is_active?: boolean;
    background_color?: string | null;
    background_image_url?: string | null;
    text_color?: string | null;
  }) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as TimerResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update timer.");
      }

      const wasStyleUpdateOnly =
        payload.target_time === undefined &&
        payload.is_active === undefined &&
        (payload.background_color !== undefined ||
          payload.background_image_url !== undefined ||
          payload.text_color !== undefined);

      toast({
        title: wasStyleUpdateOnly ? "Style updated" : "Timer updated",
        description: wasStyleUpdateOnly
          ? "Homepage appearance saved."
          : data.is_active
            ? "Countdown started successfully."
            : "Countdown stopped and reset.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description:
          error instanceof Error ? error.message : "Unexpected error updating timer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartTimer() {
    const h = Number(hours) || 0;
    const m = Number(minutes) || 0;
    const s = Number(seconds) || 0;

    if (h < 0 || m < 0 || s < 0) {
      toast({ title: "Invalid duration", description: "Values must be non-negative.", variant: "destructive" });
      return;
    }

    const totalMs = (h * 3600 + m * 60 + s) * 1000;

    if (totalMs <= 0) {
      toast({ title: "Missing duration", description: "Enter a duration greater than 0.", variant: "destructive" });
      return;
    }

    const target = new Date(Date.now() + totalMs);

    await updateTimer({
      target_time: target.toISOString(),
      is_active: true,
    });
  }

  async function handleStopTimer() {
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    await updateTimer({
      target_time: null,
      is_active: false,
    });
  }

  async function handleBackgroundImageUpload(file: File) {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error ?? "Failed to upload image");
      }

      const data = (await response.json()) as { publicUrl: string; filename: string };

      console.log("Upload response:", data);
      setBackgroundImageUrl(data.publicUrl);
      setBackgroundImageFileName(file.name);
      toast({
        title: "Image uploaded",
        description: "Background image ready to save.",
      });
    } catch (error) {
      console.error("Upload exception:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSaveAppearance() {
    console.log("Saving with backgroundImageUrl:", backgroundImageUrl);
    await updateTimer({
      background_color: backgroundColor,
      background_image_url: backgroundImageUrl || null,
      text_color: textColor,
    });
  }

  function handleLogout() {
    try {
      localStorage.removeItem("adminAuthenticated");
    } catch {}
    setIsAuthenticated(false);
    toast({ title: "Logged out", description: "Admin session ended." });
  }

  async function handleLogin(username: string, password: string) {
    // simple client-side check (not secure) per request
    if (username === "admin" && password === "123") {
      try {
        localStorage.setItem("adminAuthenticated", "true");
      } catch {}
      setIsAuthenticated(true);
      toast({ title: "Login successful", description: "You can now control the timer." });
      return true;
    }

    toast({ title: "Login failed", description: "Invalid credentials.", variant: "destructive" });
    return false;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_15%_15%,#1e293b_0%,#0b1120_45%,#020617_100%)] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_20%,rgba(148,163,184,0.12)_50%,transparent_75%)]" />
      <Card className="relative z-10 w-full max-w-2xl border-zinc-700/60 bg-zinc-900/75 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight text-zinc-100">Countdown Admin</CardTitle>
          <CardDescription className="text-zinc-300">
            Control countdown timing and homepage appearance in real time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isAuthenticated ? (
            <LoginForm onLogin={handleLogin} />
          ) : (
            <>
              <div className="space-y-2 rounded-lg border border-zinc-700/60 bg-zinc-950/40 p-4">
                <Label>Countdown Duration (HH:MM:SS)</Label>
                <div className="flex gap-2">
                  <div className="w-1/3">
                    <Label htmlFor="hours">Hours</Label>
                    <Input
                      id="hours"
                      type="number"
                      min={0}
                      value={hours}
                      onChange={(e) => setHours(Number(e.target.value))}
                    />
                  </div>
                  <div className="w-1/3">
                    <Label htmlFor="minutes">Minutes</Label>
                    <Input
                      id="minutes"
                      type="number"
                      min={0}
                      max={59}
                      value={minutes}
                      onChange={(e) => setMinutes(Number(e.target.value))}
                    />
                  </div>
                  <div className="w-1/3">
                    <Label htmlFor="seconds">Seconds</Label>
                    <Input
                      id="seconds"
                      type="number"
                      min={0}
                      max={59}
                      value={seconds}
                      onChange={(e) => setSeconds(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="sm:flex-1" onClick={handleStartTimer} disabled={isLoading}>
                  {isLoading ? "Updating..." : "Start Timer"}
                </Button>
                <Button
                  className="sm:flex-1"
                  variant="destructive"
                  onClick={handleStopTimer}
                  disabled={isLoading}
                >
                  {isLoading ? "Updating..." : "Stop/Reset Timer"}
                </Button>
              </div>
              <div className="space-y-3 rounded-lg border border-zinc-700/60 bg-zinc-950/40 p-4">
                <p className="text-sm font-semibold text-zinc-100">Homepage Appearance</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="background-color">Background Color</Label>
                    <Input
                      id="background-color"
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="text-color">Timer Text Color</Label>
                    <Input
                      id="text-color"
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="background-image">Background Image</Label>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      id="background-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        if (file) {
                          handleBackgroundImageUpload(file);
                        }
                      }}
                      disabled={isUploading}
                      className="flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  {backgroundImageFileName && (
                    <p className="text-xs text-zinc-400">
                      Uploaded: {backgroundImageFileName}
                    </p>
                  )}
                </div>
                <Button className="w-full sm:w-auto" onClick={handleSaveAppearance} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Appearance"}
                </Button>
              </div>
              <div className="pt-2">
                <Button variant="ghost" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function LoginForm({ onLogin }: { onLogin: (u: string, p: string) => Promise<boolean> | boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      await onLogin(username, password);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="login-username">Username</Label>
        <Input
          id="login-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
