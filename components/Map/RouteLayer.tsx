"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { RouteData, WaypointDetail, PointOfInterest } from "@/lib/types";

interface RouteLayerProps {
  map: mapboxgl.Map;
  routeData: RouteData | null;
}

const ROUTE_SOURCE = "route-source";
const ROUTE_LAYER = "route-layer";
const ROUTE_OUTLINE = "route-outline";

const METERS_PER_MILE = 1609.344;

function haversineMeters(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getMileMarkerPositions(
  coords: number[][]
): { lngLat: [number, number]; mile: number }[] {
  const markers: { lngLat: [number, number]; mile: number }[] = [];
  let cumulativeMeters = 0;
  let nextMile = 1;

  for (let i = 1; i < coords.length; i++) {
    const segLen = haversineMeters(
      coords[i - 1][0],
      coords[i - 1][1],
      coords[i][0],
      coords[i][1]
    );
    const prevCumulative = cumulativeMeters;
    cumulativeMeters += segLen;

    while (nextMile * METERS_PER_MILE <= cumulativeMeters) {
      const targetMeters = nextMile * METERS_PER_MILE;
      const overshoot = targetMeters - prevCumulative;
      const t = segLen > 0 ? overshoot / segLen : 0;

      const lng = coords[i - 1][0] + t * (coords[i][0] - coords[i - 1][0]);
      const lat = coords[i - 1][1] + t * (coords[i][1] - coords[i - 1][1]);

      markers.push({ lngLat: [lng, lat], mile: nextMile });
      nextMile++;
    }
  }

  return markers;
}

export default function RouteLayer({ map, routeData }: RouteLayerProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);

  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    popupsRef.current.forEach((p) => p.remove());
    popupsRef.current = [];

    if (!map || !map.getStyle()) return;

    if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
    if (map.getLayer(ROUTE_OUTLINE)) map.removeLayer(ROUTE_OUTLINE);
    if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);

    if (!routeData?.route_geometry) return;

    const geometry = routeData.route_geometry as GeoJSON.LineString;
    const details = routeData.waypoint_details;

    map.addSource(ROUTE_SOURCE, {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry },
    });

    map.addLayer({
      id: ROUTE_OUTLINE,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#FDBA74",
        "line-width": 8,
        "line-opacity": 0.6,
      },
    });

    map.addLayer({
      id: ROUTE_LAYER,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#F97316",
        "line-width": 4,
      },
    });

    const coords = geometry.coordinates;
    if (coords.length > 0) {
      const startDetail = details?.[0];
      const startEl = createMarkerEl("#22C55E", "S");
      const startMarker = new mapboxgl.Marker({ element: startEl })
        .setLngLat(coords[0] as [number, number])
        .addTo(map);
      if (startDetail) {
        attachWaypointPopup(map, startEl, startMarker, startDetail, popupsRef);
      }
      markersRef.current.push(startMarker);

      const lastCoord = coords[coords.length - 1];
      const isLoop =
        Math.abs(coords[0][0] - lastCoord[0]) < 0.001 &&
        Math.abs(coords[0][1] - lastCoord[1]) < 0.001;

      if (!isLoop) {
        const endDetail = details?.[details.length - 1];
        const endEl = createMarkerEl("#EF4444", "E");
        const endMarker = new mapboxgl.Marker({ element: endEl })
          .setLngLat(lastCoord as [number, number])
          .addTo(map);
        if (endDetail) {
          attachWaypointPopup(map, endEl, endMarker, endDetail, popupsRef);
        }
        markersRef.current.push(endMarker);
      }

      const milePositions = getMileMarkerPositions(coords);
      milePositions.forEach(({ lngLat, mile }) => {
        const el = createMileMarkerEl(mile);
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat(lngLat)
          .addTo(map);
        markersRef.current.push(marker);
      });

      if (routeData.waypoints && routeData.waypoints.length > 2) {
        const innerWaypoints = routeData.waypoints.slice(1, -1);
        const innerDetails = details?.slice(1, -1);
        innerWaypoints.forEach((wp, i) => {
          const wrapper = document.createElement("div");
          wrapper.style.cssText = "cursor:pointer;padding:4px;";

          const dot = document.createElement("div");
          dot.className = "waypoint-dot";
          dot.style.cssText =
            "width:12px;height:12px;background:#F97316;border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);transition:transform 0.15s ease;";
          wrapper.appendChild(dot);

          wrapper.addEventListener("mouseenter", () => {
            dot.style.transform = "scale(1.4)";
          });
          wrapper.addEventListener("mouseleave", () => {
            dot.style.transform = "scale(1)";
          });

          const marker = new mapboxgl.Marker({ element: wrapper, anchor: "center" })
            .setLngLat([wp[1], wp[0]])
            .addTo(map);
          const detail = innerDetails?.[i];
          if (detail) {
            attachWaypointPopup(map, wrapper, marker, detail, popupsRef);
          }
          markersRef.current.push(marker);
        });
      }

      if (routeData.points_of_interest?.length) {
        routeData.points_of_interest.forEach((poi) => {
          const wrapper = document.createElement("div");
          wrapper.style.cssText = "cursor:pointer;padding:4px;";

          const diamond = document.createElement("div");
          diamond.style.cssText =
            "width:14px;height:14px;background:#8B5CF6;border:2px solid white;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,0.3);transform:rotate(45deg);transition:transform 0.15s ease;";
          wrapper.appendChild(diamond);

          wrapper.addEventListener("mouseenter", () => {
            diamond.style.transform = "rotate(45deg) scale(1.3)";
          });
          wrapper.addEventListener("mouseleave", () => {
            diamond.style.transform = "rotate(45deg) scale(1)";
          });

          const marker = new mapboxgl.Marker({ element: wrapper, anchor: "center" })
            .setLngLat([poi.lng, poi.lat])
            .addTo(map);
          attachPoiPopup(map, wrapper, marker, poi, popupsRef);
          markersRef.current.push(marker);
        });
      }

      const bounds = coords.reduce(
        (b, c) => b.extend(c as [number, number]),
        new mapboxgl.LngLatBounds(
          coords[0] as [number, number],
          coords[0] as [number, number]
        )
      );
      map.fitBounds(bounds, { padding: 60, duration: 1000 });
    }
  }, [map, routeData]);

  return null;
}

function attachWaypointPopup(
  map: mapboxgl.Map,
  el: HTMLElement,
  marker: mapboxgl.Marker,
  detail: WaypointDetail,
  popupsRef: React.MutableRefObject<mapboxgl.Popup[]>
) {
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12,
    className: "waypoint-popup",
    maxWidth: "220px",
  }).setHTML(
    `<div style="font-family:system-ui,sans-serif;">` +
      `<div style="font-weight:700;font-size:13px;color:#1E293B;margin-bottom:2px;">${escapeHtml(detail.name)}</div>` +
      `<div style="font-size:11px;color:#64748B;line-height:1.35;">${escapeHtml(detail.reason)}</div>` +
      `</div>`
  );

  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (isTouchDevice) {
    let isOpen = false;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isOpen) {
        popup.remove();
        isOpen = false;
      } else {
        popupsRef.current.forEach((p) => p.remove());
        popup.setLngLat(marker.getLngLat()).addTo(map);
        isOpen = true;
      }
    });
    map.on("click", () => {
      if (isOpen) {
        popup.remove();
        isOpen = false;
      }
    });
  } else {
    el.addEventListener("mouseenter", () => {
      popup.setLngLat(marker.getLngLat()).addTo(map);
    });
    el.addEventListener("mouseleave", () => {
      popup.remove();
    });
  }

  popupsRef.current.push(popup);
}

function attachPoiPopup(
  map: mapboxgl.Map,
  el: HTMLElement,
  marker: mapboxgl.Marker,
  poi: PointOfInterest,
  popupsRef: React.MutableRefObject<mapboxgl.Popup[]>
) {
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 14,
    className: "waypoint-popup poi-popup",
    maxWidth: "240px",
  }).setHTML(
    `<div style="font-family:system-ui,sans-serif;">` +
      `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">` +
      `<span style="font-size:13px;">✦</span>` +
      `<span style="font-weight:700;font-size:13px;color:#1E293B;">${escapeHtml(poi.name)}</span>` +
      `</div>` +
      `<div style="font-size:11px;color:#64748B;line-height:1.35;">${escapeHtml(poi.description)}</div>` +
      `</div>`
  );

  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (isTouchDevice) {
    let isOpen = false;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isOpen) {
        popup.remove();
        isOpen = false;
      } else {
        popupsRef.current.forEach((p) => p.remove());
        popup.setLngLat(marker.getLngLat()).addTo(map);
        isOpen = true;
      }
    });
    map.on("click", () => {
      if (isOpen) {
        popup.remove();
        isOpen = false;
      }
    });
  } else {
    el.addEventListener("mouseenter", () => {
      popup.setLngLat(marker.getLngLat()).addTo(map);
    });
    el.addEventListener("mouseleave", () => {
      popup.remove();
    });
  }

  popupsRef.current.push(popup);
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function createMarkerEl(color: string, letter: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width: 28px; height: 28px;
    background: ${color};
    border: 3px solid white;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; color: white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    cursor: pointer;
  `;
  el.textContent = letter;
  return el;
}

function createMileMarkerEl(mile: number): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    display: flex; align-items: center; gap: 0;
    pointer-events: auto; cursor: default;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.35));
  `;

  const flag = document.createElement("div");
  flag.style.cssText = `
    background: #1E293B;
    color: #F8FAFC;
    font-size: 11px; font-weight: 700;
    line-height: 1;
    padding: 3px 6px;
    border-radius: 4px;
    white-space: nowrap;
    border: 1.5px solid rgba(255,255,255,0.5);
  `;
  flag.textContent = `MI ${mile}`;

  const tick = document.createElement("div");
  tick.style.cssText = `
    width: 8px; height: 8px;
    background: #1E293B;
    border-radius: 50%;
    border: 2px solid white;
    margin-left: -4px;
    flex-shrink: 0;
  `;

  el.appendChild(flag);
  el.appendChild(tick);
  return el;
}
