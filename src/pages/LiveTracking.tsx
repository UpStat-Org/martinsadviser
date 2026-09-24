import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, MapPin, PauseCircle, PlayCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type Session = { status: "ready" | "sharing" | "stopped"; expires_at: string; driver_name: string | null; load: { reference: string | null; origin_city: string | null; origin_region: string | null; destination_city: string | null; destination_region: string | null } | null };

function lane(load: Session["load"]) {
  if (!load) return "Trip";
  const place = (city: string | null, region: string | null) => [city, region].filter(Boolean).join(", ");
  return `${place(load.origin_city, load.origin_region) || "Origin"} → ${place(load.destination_city, load.destination_region) || "Destination"}`;
}

export default function LiveTracking() {
  const { token = "" } = useParams<{ token: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "sharing" | "stopped" | "error">("loading");
  const [message, setMessage] = useState("");
  const watchId = useRef<number | null>(null);
  const lastSent = useRef<{ at: number; latitude: number; longitude: number } | null>(null);

  const call = useCallback(async (action: "session" | "start" | "location" | "stop", extra = {}) => {
    const { data, error } = await supabase.functions.invoke("load-tracking", { body: { token, action, ...extra } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error === "expired_link" ? "This tracking link has expired." : "This tracking link is no longer active.");
    return data;
  }, [token]);

  useEffect(() => { call("session").then((data) => { setSession(data); setName(data.driver_name ?? ""); setState(data.status); }).catch((error: Error) => { setMessage(error.message); setState("error"); }); }, [call]);
  useEffect(() => () => { if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current); }, []);

  const sendPosition = useCallback(async (position: GeolocationPosition) => {
    const now = Date.now();
    const previous = lastSent.current;
    const moved = !previous || Math.hypot(position.coords.latitude - previous.latitude, position.coords.longitude - previous.longitude) > 0.00018;
    if (previous && now - previous.at < 10_000 && !moved) return;
    lastSent.current = { at: now, latitude: position.coords.latitude, longitude: position.coords.longitude };
    try {
      await call("location", {
        latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy_m: position.coords.accuracy, heading: position.coords.heading, speed_mps: position.coords.speed,
        recorded_at: new Date(position.timestamp).toISOString(),
      });
      setMessage("Location shared successfully.");
    } catch { setMessage("Could not send this location. Check your connection and try again."); }
  }, [call]);

  const start = async () => {
    if (!navigator.geolocation) { setMessage("This browser does not support location sharing."); return; }
    try {
      await call("start", { driver_name: name });
      setState("sharing");
      setMessage("Sharing is active. Keep this page open during the trip.");
      watchId.current = navigator.geolocation.watchPosition(sendPosition, (error) => {
        setMessage(error.code === error.PERMISSION_DENIED ? "Location permission was not granted." : "We could not determine your location.");
      }, { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start sharing."); }
  };
  const stop = async () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    try { await call("stop"); setState("stopped"); setMessage("Location sharing has ended."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not stop sharing."); }
  };

  return <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4"><Card className="w-full max-w-lg"><CardHeader><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2"><MapPin className="w-5 h-5 text-primary" /></div><CardTitle>{session?.load?.reference || "Live trip tracking"}</CardTitle><CardDescription>{session ? lane(session.load) : "Verifying your secure tracking link…"}</CardDescription></CardHeader><CardContent className="space-y-5">
    {state === "loading" ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div> : state === "error" ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : <>
      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground flex gap-2"><ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-success" /><span>Your location is shared only for this trip. You can stop it at any time; this link expires on {session && new Date(session.expires_at).toLocaleString()}.</span></div>
      {state === "ready" && <div className="space-y-2"><Label htmlFor="tracking-name">Your name (optional)</Label><Input id="tracking-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} /></div>}
      <Button className="w-full" onClick={state === "sharing" ? stop : start} disabled={state === "stopped"}>{state === "sharing" ? <><PauseCircle /> Stop sharing location</> : <><PlayCircle /> Start sharing location</>}</Button>
      {message && <p className="text-sm text-muted-foreground text-center">{message}</p>}
      <p className="text-xs text-muted-foreground text-center">For reliable updates, keep this page open and allow precise location access.</p>
    </>}
  </CardContent></Card></main>;
}
