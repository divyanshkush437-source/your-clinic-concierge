import { useEffect, useRef, useState } from "react";
import { MapPin, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";

type LatLng = { lat: number; lng: number };

declare global {
  interface Window {
    google?: any;
    __initSmartClinicMap?: () => void;
  }
}

let mapsLoader: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (mapsLoader) return mapsLoader;
  mapsLoader = new Promise<void>((resolve, reject) => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) return reject(new Error("Google Maps key missing"));
    window.__initSmartClinicMap = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__initSmartClinicMap${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return mapsLoader;
}

export function ClinicLocationPicker({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (cancelled || !mapDivRef.current) return;
        const center = value ?? { lat: 20.5937, lng: 78.9629 }; // India
        const zoom = value ? 15 : 5;
        const map = new window.google.maps.Map(mapDivRef.current, {
          center,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        const marker = new window.google.maps.Marker({
          position: center,
          map,
          draggable: true,
        });
        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (p) onChange({ lat: p.lat(), lng: p.lng() });
        });
        map.addListener("click", (e: any) => {
          if (!e.latLng) return;
          marker.setPosition(e.latLng);
          onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
        mapRef.current = map;
        markerRef.current = marker;
        setReady(true);
      })
      .catch((err) => setError(err.message ?? "Could not load map"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect external value changes
  useEffect(() => {
    if (!ready || !value || !markerRef.current || !mapRef.current) return;
    const pos = { lat: value.lat, lng: value.lng };
    markerRef.current.setPosition(pos);
    mapRef.current.panTo(pos);
  }, [ready, value?.lat, value?.lng]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const v = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(v);
        if (mapRef.current) {
          mapRef.current.setZoom(16);
          mapRef.current.panTo(v);
        }
      },
      () => setError("Could not get current location"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" /> Pin your clinic on the map
        </div>
        <Button type="button" size="sm" variant="outline" onClick={useMyLocation}>
          <LocateFixed className="mr-1 h-3.5 w-3.5" /> Use my location
        </Button>
      </div>
      <div ref={mapDivRef} className="h-72 w-full overflow-hidden rounded-lg border bg-muted" />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value ? (
        <p className="text-xs text-muted-foreground">
          Lat: <span className="font-mono">{value.lat.toFixed(6)}</span> · Lng:{" "}
          <span className="font-mono">{value.lng.toFixed(6)}</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Tap or drag the pin to set your clinic location.</p>
      )}
    </div>
  );
}

export function ClinicLocationMap({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (cancelled || !ref.current) return;
        const center = { lat, lng };
        const map = new window.google.maps.Map(ref.current, {
          center,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        new window.google.maps.Marker({ position: center, map, title: label ?? "Clinic" });
      })
      .catch((e) => setError(e.message ?? "Could not load map"));
    return () => {
      cancelled = true;
    };
  }, [lat, lng, label]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="space-y-2">
      <div ref={ref} className="h-64 w-full overflow-hidden rounded-lg border bg-muted" />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <a
        href={directionsUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
      >
        Get directions →
      </a>
    </div>
  );
}
