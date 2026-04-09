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
  onReset?: () => void;
  optimalPoints: { lat: number; lng: number }[];
  isLoading: boolean;
  initialCoords?: Coordinates;
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
    if (window.google?.maps) {
      resolve();
      return;
    }
    if (!window.__gmaps_callbacks__) {
      window.__gmaps_callbacks__ = [];
    }
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
  onReset,
  optimalPoints,
  isLoading,
}: WindMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const optimalMarkersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);
  const pointsRef = useRef<{ lat: number; lng: number }[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [pointCount, setPointCount] = useState(0);

  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 43.275, lng: 76.925 },
      zoom: 11,
    });

    mapInstance.current = map;
    setMapReady(true);

    map.addListener("click", (e: any) => {
      if (!e.latLng) return;
      if (pointsRef.current.length >= 4) return;

      const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      pointsRef.current = [...pointsRef.current, newPoint];
      setPointCount(pointsRef.current.length);

      const marker = new window.google.maps.Marker({
        position: newPoint,
        map,
        label: String(pointsRef.current.length),
      });
      markersRef.current.push(marker);

      if (pointsRef.current.length === 4) {
        if (polygonRef.current) polygonRef.current.setMap(null);

        const pts = pointsRef.current;
        const center = {
          lat: pts.reduce((s, p) => s + p.lat, 0) / 4,
          lng: pts.reduce((s, p) => s + p.lng, 0) / 4,
        };
        const sorted = [...pts].sort((a, b) => {
          const angleA = Math.atan2(a.lat - center.lat, a.lng - center.lng);
          const angleB = Math.atan2(b.lat - center.lat, b.lng - center.lng);
          return angleA - angleB;
        });

        polygonRef.current = new window.google.maps.Polygon({
          paths: sorted,
          strokeColor: "#00BFA5",
          strokeWeight: 3,
          fillColor: "#00BFA5",
          fillOpacity: 0.3,
          map,
        });

        const lats = pts.map((p) => p.lat);
        const lngs = pts.map((p) => p.lng);
        onAreaSelected({
          lat_min: Math.min(...lats),
          lat_max: Math.max(...lats),
          lon_min: Math.min(...lngs),
          lon_max: Math.max(...lngs),
        });
      }
    });
  }, [onAreaSelected]);

  useEffect(() => {
    loadGoogleMaps().then(() => initMap());
  }, [initMap]);

  // Always clear previous optimal markers before rendering new ones
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
          scale: 8,
          fillColor: "#FF5722",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      optimalMarkersRef.current.push(marker);
    });
  }, [optimalPoints]);

  const handleReset = () => {
    // Clear selection markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Clear polygon
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }

    // Clear optimal markers
    optimalMarkersRef.current.forEach((m) => m.setMap(null));
    optimalMarkersRef.current = [];

    // Reset state
    pointsRef.current = [];
    setPointCount(0);

    // Notify parent to clear coords and result
    onAreaSelected({ lat_min: 0, lat_max: 0, lon_min: 0, lon_max: 0 });
    onReset?.();
  };

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

      {mapReady && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            color: "#fff",
            padding: "6px 16px",
            borderRadius: "20px",
            fontSize: "13px",
            fontWeight: 500,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
          }}
        >
          {pointCount < 4
            ? `Click to place point ${pointCount + 1} of 4`
            : "✓ Area selected — reset to pick again"}
        </div>
      )}

      {pointCount > 0 && (
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
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#ffebee";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "#ef9a9a";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#fff";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "#ffcdd2";
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
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
          }}
        >
          Optimizing…
        </div>
      )}
    </div>
  );
}
