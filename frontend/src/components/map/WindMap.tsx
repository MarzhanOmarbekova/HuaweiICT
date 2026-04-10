"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

interface Coordinates {
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
}

interface WindMapProps {
  onAreaSelected: (coords: Coordinates) => void;
  // Колбэк для передачи 4 угловых точек наружу
  onBoundaryPointsChange?: (points: { lat: number; lng: number }[]) => void;
  onReset?: () => void;
  optimalPoints: { lat: number; lng: number }[];
  isLoading: boolean;
  initialCoords?: Coordinates;
  // 4 угловые точки из истории для восстановления полигона
  boundaryPoints?: { lat: number; lng: number }[];
  // Блокировка карты (режим просмотра истории)
  locked?: boolean;
}

const GOOGLE_MAPS_API_KEY = "AIzaSyCQF0pai6dW89n7AON7BqDVQMfcC6pEQYY";

declare global {
  interface Window {
    google: any;
    __gmaps_loaded__: boolean;
    __gmaps_callbacks__: (() => void)[];
    initGoogleMaps: () => void;
  }
}

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.maps) { resolve(); return; }
    if (!window.__gmaps_callbacks__) window.__gmaps_callbacks__ = [];
    window.__gmaps_callbacks__.push(resolve);
    if (window.__gmaps_loaded__) return;
    window.__gmaps_loaded__ = true;
    window.initGoogleMaps = () => {
      window.__gmaps_callbacks__.forEach((cb) => cb());
      window.__gmaps_callbacks__ = [];
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

export default function WindMap({
                                  onAreaSelected,
                                  onBoundaryPointsChange,
                                  onReset,
                                  optimalPoints,
                                  isLoading,
                                  initialCoords,
                                  boundaryPoints,
                                  locked = false,
                                }: WindMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const optimalMarkersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);
  const historyPolygonRef = useRef<any>(null);
  const pointsRef = useRef<{ lat: number; lng: number }[]>([]);
  const clickListenerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [pointCount, setPointCount] = useState(0);

  // ── Инициализация карты ──────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 43.275, lng: 76.925 },
      zoom: 11,
    });
    mapInstance.current = map;
    setMapReady(true);
  }, []);

  useEffect(() => {
    loadGoogleMaps().then(() => initMap());
  }, [initMap]);

  // ── Рисуем полигон по точкам ─────────────────────────────────
  const drawPolygon = useCallback(
      (
          pts: { lat: number; lng: number }[],
          color = "#00BFA5",
          ref: React.MutableRefObject<any>
      ) => {
        if (!mapInstance.current || pts.length < 3) return;
        if (ref.current) ref.current.setMap(null);

        const center = {
          lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
          lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
        };
        const sorted = [...pts].sort((a, b) => {
          const angleA = Math.atan2(a.lat - center.lat, a.lng - center.lng);
          const angleB = Math.atan2(b.lat - center.lat, b.lng - center.lng);
          return angleA - angleB;
        });

        ref.current = new window.google.maps.Polygon({
          paths: sorted,
          strokeColor: color,
          strokeWeight: 3,
          fillColor: color,
          fillOpacity: 0.2,
          map: mapInstance.current,
        });
      },
      []
  );

  // ── Управление кликами ────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;

    if (clickListenerRef.current) {
      window.google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }

    // Если карта заблокирована — не вешаем слушатель
    if (locked) return;

    clickListenerRef.current = mapInstance.current.addListener(
        "click",
        (e: any) => {
          if (!e.latLng) return;
          if (pointsRef.current.length >= 4) return;

          const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          const newPoints = [...pointsRef.current, newPoint];
          pointsRef.current = newPoints;
          setPointCount(newPoints.length);

          // Маркер с номером
          const marker = new window.google.maps.Marker({
            position: newPoint,
            map: mapInstance.current,
            label: String(newPoints.length),
          });
          markersRef.current.push(marker);

          if (newPoints.length === 4) {
            drawPolygon(newPoints, "#00BFA5", polygonRef);

            // Передаём 4 точки наружу
            onBoundaryPointsChange?.(newPoints);

            const lats = newPoints.map((p) => p.lat);
            const lngs = newPoints.map((p) => p.lng);
            onAreaSelected({
              lat_min: Math.min(...lats),
              lat_max: Math.max(...lats),
              lon_min: Math.min(...lngs),
              lon_max: Math.max(...lngs),
            });
          }
        }
    );

    return () => {
      if (clickListenerRef.current) {
        window.google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [mapReady, locked, onAreaSelected, onBoundaryPointsChange, drawPolygon]);

  // ── Оптимальные точки (красные маркеры) ─────────────────────
  useEffect(() => {
    if (!mapInstance.current) return;

    optimalMarkersRef.current.forEach((m) => m.setMap(null));
    optimalMarkersRef.current = [];

    if (!optimalPoints?.length) return;

    optimalPoints.forEach((pt) => {
      const marker = new window.google.maps.Marker({
        position: pt,
        map: mapInstance.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#FF5722",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      optimalMarkersRef.current.push(marker);
    });
  }, [optimalPoints]);

  // ── Полигон из истории ────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;

    // Убираем старый полигон истории
    if (historyPolygonRef.current) {
      historyPolygonRef.current.setMap(null);
      historyPolygonRef.current = null;
    }

    if (!boundaryPoints?.length) return;

    drawPolygon(boundaryPoints, "#3b82f6", historyPolygonRef);
  }, [boundaryPoints, mapReady, drawPolygon]);

  // ── fitBounds ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !initialCoords) return;
    if (initialCoords.lat_min === 0 && initialCoords.lat_max === 0) return;

    try {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: initialCoords.lat_min, lng: initialCoords.lon_min });
      bounds.extend({ lat: initialCoords.lat_max, lng: initialCoords.lon_max });
      mapInstance.current.fitBounds(bounds);

      window.google.maps.event.addListenerOnce(
          mapInstance.current,
          "bounds_changed",
          () => {
            if (mapInstance.current.getZoom() > 14) mapInstance.current.setZoom(14);
          }
      );
    } catch (e) {
      console.error("fitBounds error:", e);
    }
  }, [initialCoords, mapReady]);

  // ── Сброс при обнулении координат ───────────────────────────
  useEffect(() => {
    if (initialCoords?.lat_min === 0 && initialCoords?.lat_max === 0) {
      // Чистим ручные маркеры
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      // Чистим зеленый полигон выбора
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }

      pointsRef.current = [];
      setPointCount(0);
    }
  }, [initialCoords]);

  // ── Reset кнопка ─────────────────────────────────────────────
  const handleReset = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (polygonRef.current) { polygonRef.current.setMap(null); polygonRef.current = null; }
    if (historyPolygonRef.current) { historyPolygonRef.current.setMap(null); historyPolygonRef.current = null; }

    optimalMarkersRef.current.forEach((m) => m.setMap(null));
    optimalMarkersRef.current = [];

    pointsRef.current = [];
    setPointCount(0);

    onBoundaryPointsChange?.([]);
    onAreaSelected({ lat_min: 0, lat_max: 0, lon_min: 0, lon_max: 0 });
    onReset?.();
  };

  const showResetButton =
      pointCount > 0 ||
      optimalPoints.length > 0 ||
      (boundaryPoints?.length ?? 0) > 0;

  return (
      <div
          style={{
            position: "relative",
            width: "100%",
            height: "500px",
            borderRadius: "12px",
            overflow: "hidden",
          }}
      >
        {!mapReady && (
            <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f5f5f5",
                  zIndex: 10,
                }}
            >
              Loading map…
            </div>
        )}

        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {/* Оверлей-блокировка — перехватывает клики поверх карты */}
        {locked && mapReady && (
            <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 5,
                  cursor: "not-allowed",
                  background: "rgba(59,130,246,0.04)",
                }}
                onClick={(e) => e.stopPropagation()}
            />
        )}

        {/* Подсказка */}
        {mapReady && (
            <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: locked ? "rgba(59,130,246,0.85)" : "rgba(0,0,0,0.65)",
                  backdropFilter: "blur(6px)",
                  color: "#fff",
                  padding: "6px 16px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: 500,
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.01em",
                  zIndex: 6,
                }}
            >
              {locked
                  ? "History Mode — Click Reset to select a new area"
                  : pointCount < 4
                      ? `Click to place point ${pointCount + 1} of 4`
                      : "✓ Area selected — reset to pick again"}
            </div>
        )}

        {/* Reset */}
        {showResetButton && (
            <button
                onClick={handleReset}
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#fff",
                  color: "#d32f2f",
                  border: "1.5px solid #ffcdd2",
                  borderRadius: "10px",
                  padding: "8px 20px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  transition: "all 0.15s ease",
                  zIndex: 10,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#ffebee";
                  e.currentTarget.style.borderColor = "#ef9a9a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = "#ffcdd2";
                }}
            >
              <svg
                  width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.95" />
              </svg>
              Reset selection
            </button>
        )}

        {isLoading && (
            <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: "rgba(0,0,0,0.75)",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  zIndex: 20,
                }}
            >
              Optimizing…
            </div>
        )}
      </div>
  );
}
