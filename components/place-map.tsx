"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { LocateFixed, Maximize, MapPin, Circle, Shuffle, LoaderCircle } from "lucide-react";
import { clusterPoints, createMarkerButton, markerDetail } from "../lib/map-markers";
import type { RankedPlace } from "../lib/types";

interface Props { results: RankedPlace[]; selectedId: string | null; onSelect: (id: string) => void; onLocation: (location: [number, number]) => void }
export default function PlaceMap({ results, selectedId, onSelect, onLocation }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarker = useRef<L.CircleMarker | null>(null);
  const latest = useRef({ results, onSelect, onLocation });
  latest.current = { results, onSelect, onLocation };
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const resultKey = results.map(item => `${item.place.id}:${item.recommendation.isPrimary}`).sort().join("|");

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { zoomControl: false, minZoom: 9, maxZoom: 19, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView([24.68, 46.7], 12);
    mapRef.current = map;
    L.control.zoom({ position: "topleft", zoomInTitle: "تكبير الخريطة", zoomOutTitle: "تصغير الخريطة" }).addTo(map);
    map.attributionControl.setPrefix(false);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      maxZoom: 19, keepBuffer: 1, updateWhenIdle: true,
    }).on("tileerror", () => setTileError(true)).on("tileload", () => setTileError(false)).addTo(map);
    // Preserve the geographic center throughout the sidebar's width transition.
    let camera = { center: map.getCenter(), zoom: map.getZoom() };
    let resizing = false;
    const rememberView = () => {
      if (!resizing) camera = { center: map.getCenter(), zoom: map.getZoom() };
    };
    map.on("moveend zoomend", rememberView);
    const observer = new ResizeObserver(() => {
      resizing = true;
      map.invalidateSize({ pan: false });
      map.setView(camera.center, camera.zoom, { animate: false });
      resizing = false;
    });
    observer.observe(container.current);
    setReady(true);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; userMarker.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !latest.current.results.length) return;
    const primary = latest.current.results.filter(item => item.recommendation.isPrimary);
    const points = (primary.length ? primary : latest.current.results).map(({ place }) => L.latLng(place.latitude, place.longitude));
    map.fitBounds(L.latLngBounds(points), { padding: [55, 55], maxZoom: 14, animate: false });
  }, [ready, resultKey]);

  useEffect(() => {
    const map = mapRef.current;
    const place = latest.current.results.find(item => item.place.id === selectedId)?.place;
    if (map && ready && place) map.setView([place.latitude, place.longitude], Math.max(map.getZoom(), 15), { animate: false });
  }, [selectedId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const layer = L.layerGroup().addTo(map);
    const render = () => {
      const focusedId = (document.activeElement as HTMLElement | null)?.dataset.placeId;
      layer.clearLayers();
      const detail = markerDetail(map.getZoom());
      const points = results.map(item => ({ ...item, ...map.project([item.place.latitude, item.place.longitude], map.getZoom()) }));
      // Keep the selected pin independent; cluster each shape separately.
      const selectedPoints = points.filter(item => item.place.id === selectedId);
      const unselected = points.filter(item => item.place.id !== selectedId);
      const groups = detail === "compact" ? [
        ...selectedPoints.map(point => [point]),
        ...clusterPoints(unselected.filter(item => item.recommendation.isPrimary)),
        ...clusterPoints(unselected.filter(item => !item.recommendation.isPrimary)),
      ] : points.map(point => [point]);
      const labelPositions: { x: number; y: number }[] = [];
      // Prioritize the selected label, then primary places; avoid overlapping names.
      groups.sort((a, b) => Number(b.some(item => item.place.id === selectedId)) - Number(a.some(item => item.place.id === selectedId)));
      for (const group of groups) {
        const first = group[0];
        const clustered = group.length > 1;
        const selected = first.place.id === selectedId;
        const full = !clustered && (selected || first.recommendation.isPrimary) && detail === "full" && !labelPositions.some(point => Math.abs(point.x - first.x) < 190 && Math.abs(point.y - first.y) < 54);
        if (full) labelPositions.push(first);
        const button = createMarkerButton({ name: first.place.name, category: first.place.category, primary: first.recommendation.isPrimary, selected, detail, showLabel: full, count: group.length });
        // A cluster may include several categories, so keep its color neutral.
        if (clustered && group.some(item => item.place.category !== first.place.category)) delete button.dataset.category;
        button.dataset.placeId = first.place.id;
        const latitude = group.reduce((sum, item) => sum + item.place.latitude, 0) / group.length;
        const longitude = group.reduce((sum, item) => sum + item.place.longitude, 0) / group.length;
        const width = full ? 184 : 44;
        const marker = L.marker([latitude, longitude], { icon: L.divIcon({ html: button, className: "hawlak-marker", iconSize: [width, 48], iconAnchor: [22, first.recommendation.isPrimary || selected ? 44 : 24] }), keyboard: false, zIndexOffset: selected ? 1000 : first.recommendation.isPrimary ? 100 : 0 }).addTo(layer);
        if (!clustered && window.matchMedia("(hover: hover)").matches) {
          const tooltip = document.createElement("span");
          tooltip.textContent = first.place.name;
          marker.bindTooltip(tooltip, { direction: "top", offset: [0, -25] });
        }
        L.DomEvent.disableClickPropagation(button);
        button.addEventListener("click", () => {
          if (clustered) {
            const bounds = L.latLngBounds(group.map(item => L.latLng(item.place.latitude, item.place.longitude)));
            map.setView(bounds.getCenter(), Math.min(16, Math.max(map.getZoom() + 1, map.getBoundsZoom(bounds, false, L.point(120, 120)))), { animate: false });
          }
          else latest.current.onSelect(first.place.id);
        });
        if (focusedId === first.place.id) button.focus({ preventScroll: true });
      }
    };
    render();
    map.on("zoomend", render);
    return () => { map.off("zoomend", render); layer.remove(); };
  }, [results, selectedId, ready]);

  const locate = () => {
    if (!navigator.geolocation) { setLocationStatus("المتصفح لا يدعم تحديد الموقع."); return; }
    setLocating(true); setLocationStatus("جارٍ تحديد موقعك…");
    navigator.geolocation.getCurrentPosition(position => {
      const location: [number, number] = [position.coords.latitude, position.coords.longitude];
      const map = mapRef.current;
      if (!map) return;
      userMarker.current?.remove();
      userMarker.current = L.circleMarker(location, { radius: 8, color: "white", weight: 3, fillColor: "#2e7de0", fillOpacity: 1 }).addTo(map).bindTooltip("موقعك");
      map.setView(location, 14, { animate: false });
      latest.current.onLocation(location);
      setLocating(false); setLocationStatus("تم تحديد موقعك؛ المسافات المعروضة بخط مستقيم.");
    }, error => { setLocating(false); setLocationStatus(error.code === 1 ? "لم يُسمح بتحديد الموقع. يمكنك تصفح أماكن الرياض." : "تعذر تحديد موقعك. حاول مرة أخرى."); }, { timeout: 10000, maximumAge: 60000 });
  };

  const pickPlace = () => {
    const primary = results.filter(item => item.recommendation.isPrimary);
    const pool = primary.length ? primary : results;
    const alternatives = pool.filter(item => item.place.id !== selectedId);
    const choices = alternatives.length ? alternatives : pool;
    if (choices.length) onSelect(choices[Math.floor(Math.random() * choices.length)].place.id);
  };

  return <div className="map-shell">
    <div ref={container} className="map" aria-label="خريطة أماكن الرياض" />
    <div className="map-welcome"><button onClick={pickPlace} disabled={!ready || !results.length}><Shuffle size={16}/><span>اختار لي</span></button></div>
    <div className="map-tools" role="group" aria-label="أدوات الخريطة"><button onClick={locate} disabled={!ready || locating} aria-label="تحديد موقعي" title="تحديد موقعي">{locating ? <LoaderCircle className="locating-spinner" size={18}/> : <LocateFixed size={18}/>}<span>موقعي</span></button><button aria-label="عرض جميع النتائج على الخريطة" title="عرض جميع النتائج على الخريطة" disabled={!ready || !results.length} onClick={() => { const map = mapRef.current; if (map) map.fitBounds(L.latLngBounds(results.map(({ place }) => L.latLng(place.latitude, place.longitude))), { padding: [75, 75], maxZoom: 14 }); }}><Maximize size={18}/><span>كل الأماكن</span></button></div>
    <div className="map-legend" aria-label="دليل رموز الخريطة"><span><MapPin size={15}/> من نوع طلعتك</span><span><Circle size={9}/> أماكن أخرى</span></div>
    {(tileError || locationStatus) && <div className="map-status" role="status">{tileError ? "تعذر تحميل خلفية الخريطة. الأماكن والنتائج متاحة." : locationStatus}<button onClick={() => { setTileError(false); setLocationStatus(""); }} aria-label="إغلاق التنبيه">×</button></div>}
  </div>;
}
