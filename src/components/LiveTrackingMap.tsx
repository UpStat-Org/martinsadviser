import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trackingCopy } from "@/lib/trackingCopy";
import type { Language } from "@/lib/translations";

export type TrackingPosition = {
  latitude: number;
  longitude: number;
  recorded_at: string;
};

/** A small, dependency-light live map. The Esri basemap does not require an
 * exposed browser API key; the provider can later be swapped without touching
 * tracking data. */
export function LiveTrackingMap({ positions, className, language }: {
  positions: TrackingPosition[];
  className?: string;
  language: Language;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;
    const map = L.map(elementRef.current, { zoomControl: true, scrollWheelZoom: false });
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri",
      maxZoom: 19,
    }).addTo(map);
    map.setView([39.8283, -98.5795], 4);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!positions.length) return;

    const coordinates = positions.map((point) => L.latLng(point.latitude, point.longitude));
    if (coordinates.length > 1) {
      L.polyline(coordinates, { color: "#2563eb", weight: 4, opacity: 0.8 }).addTo(layer);
    }
    const latest = coordinates[coordinates.length - 1]!;
    L.circleMarker(latest, {
      radius: 9, color: "#ffffff", weight: 3, fillColor: "#16a34a", fillOpacity: 1,
    }).bindTooltip(trackingCopy[language].currentLocation, { permanent: false }).addTo(layer);
    if (coordinates.length === 1) map.setView(latest, 14);
    else map.fitBounds(L.latLngBounds(coordinates), { padding: [28, 28], maxZoom: 15 });
  }, [language, positions]);

  return <div ref={elementRef} className={className ?? "h-80 w-full rounded-md"} aria-label={trackingCopy[language].title} />;
}
