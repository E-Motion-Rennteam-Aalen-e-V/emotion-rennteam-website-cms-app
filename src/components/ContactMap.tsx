"use client";

import { useEffect, useRef } from "react";

export default function ContactMap() {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapElement = mapContainer.current;
    const lat = 48.8425;
    const lng = 10.0763;
    const zoom = 15;

    const iframeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
        <style>
          * { margin: 0; padding: 0; }
          body { height: 100vh; overflow: hidden; }
          #map { width: 100%; height: 100%; }
          .leaflet-container { background: #1a1a1a; }
          .custom-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #0071B5, #162E7B);
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0, 113, 181, 0.3);
            border: 2px solid white;
            font-size: 18px;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${lat}, ${lng}], ${zoom});

          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          const markerIcon = L.divIcon({
            html: '<div style="width: 36px; height: 36px; background: linear-gradient(135deg, #0071B5, #162E7B); border-radius: 50%; box-shadow: 0 4px 12px rgba(0, 113, 181, 0.3); border: 2px solid white; display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 18px; font-weight: bold;">📍</span></div>',
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36]
          });

          L.marker([${lat}, ${lng}], { icon: markerIcon })
            .bindPopup('<div style="color: white; font-family: system-ui; text-align: center;"><strong>E-Motion Rennteam</strong><br/>Hochschule Aalen<br/>Beethovenstraße 1<br/>73430 Aalen</div>')
            .openPopup()
            .addTo(map);
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([iframeHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.title = 'Standort des E-Motion Rennteams auf der Karte';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = 'inherit';

    mapElement.innerHTML = '';
    mapElement.appendChild(iframe);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      className="h-full w-full rounded-xl border border-border overflow-hidden bg-gradient-to-br from-surface to-surface/50"
    />
  );
}
