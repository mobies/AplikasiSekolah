"use client";
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in Leaflet + Next.js
const icon = L.icon({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onSelect: (lat: number, lng: number) => void;
}

export default function MapPicker({ initialLat, initialLng, onSelect }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current || mapRef.current) return;

    const center: [number, number] = initialLat && initialLng ? [initialLat, initialLng] : [-6.2000, 106.8166];
    
    // Initialize Map manually to avoid React-Leaflet appendChild issues
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: 13,
      scrollWheelZoom: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initial Marker
    if (initialLat && initialLng) {
      markerRef.current = L.marker(center, { icon }).addTo(map);
    }

    // Click Handler
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng(e.latlng);
      } else {
        markerRef.current = L.marker(e.latlng, { icon }).addTo(map);
      }
      onSelect(lat, lng);
    });

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update view if initial values change externally
  useEffect(() => {
    if (mapRef.current && initialLat && initialLng) {
      const newPos: [number, number] = [initialLat, initialLng];
      // Only fly if distance is significant to avoid jitter
      const currentCenter = mapRef.current.getCenter();
      if (Math.abs(currentCenter.lat - initialLat) > 0.0001 || Math.abs(currentCenter.lng - initialLng) > 0.0001) {
         mapRef.current.setView(newPos);
         if (markerRef.current) {
           markerRef.current.setLatLng(newPos);
         } else {
           markerRef.current = L.marker(newPos, { icon }).addTo(mapRef.current);
         }
      }
    }
  }, [initialLat, initialLng]);

  return (
    <div className="w-full h-[300px] rounded-[32px] overflow-hidden border-2 border-slate-800 shadow-inner bg-slate-950 relative">
      <div 
        ref={mapContainerRef}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
