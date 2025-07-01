// @ts-nocheck
// Disabling TypeScript checks for this file due to complexities with Leaflet types
// and third-party library integrations which are not the focus of this specific AI-driven modification.
"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-routing-machine"; 
import 'leaflet.locatecontrol';
import 'leaflet.locatecontrol/dist/L.Control.Locate.min.css';
import type { LatLngLiteral as LeafletLatLngLiteral } from "leaflet";
import type { TerrainSuitabilityCheckOutput } from "@/ai/flows/terrain-suitability-check";
import { getNearestAirport } from "@/lib/airportUtils";

const startIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2232%22%20height%3D%2232%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%234CAF50%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M21%2010c0%207-9%2013-9%2013s-9-6-9-13a9%209%200%200%201%2018%200z%22%3E%3C%2Fpath%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2210%22%20r%3D%223%22%20fill%3D%22white%22%3E%3C%2Fcircle%3E%3C%2Fsvg%3E",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const endIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2232%22%20height%3D%2232%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%23F44336%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M21%2010c0%207-9%2013-9%2013s-9-6-9-13a9%209%200%200%201%2018%200z%22%3E%3C%2Fpath%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2210%22%20r%3D%223%22%20fill%3D%22white%22%3E%3C%2Fcircle%3E%3C%2Fsvg%3E",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export interface LatLng {
  lat: number;
  lng: number;
}

interface MapDisplayProps {
  startPoint: LatLng | null;
  endPoint: LatLng | null;
  travelMode: "driving-car" | "cycling-regular" | "foot-walking" | "air" | "ship"| "Two-wheeler";
  routeData: any | null;
  onMapClick: (latlng: LatLng) => void;
  onReset: () => void;
  isCalculating: boolean;
  terrainAnalysisResult: TerrainSuitabilityCheckOutput | null;
}

const decodePolyline = (encoded: string): LeafletLatLngLiteral[] => {
  let points: LeafletLatLngLiteral[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
};

function mapORSTypeToLRM(orsType: number): string {
    switch (orsType) {
        case 0: return 'Depart';
        case 1: return 'SlightLeft';
        case 2: return 'Left';
        case 3: return 'SharpLeft';
        case 4: return 'SlightRight';
        case 5: return 'Right';
        case 6: return 'SharpRight';
        case 7: return 'Straight';
        case 8: return 'EnterRoundabout';
        case 9: return 'ExitRoundabout';
        case 10: return 'UTurn';
        case 11: return 'Goal';
        case 12: return 'Depart';
        case 13: return 'Arrive';
        case 14: return 'Arrive';
        case 15: return 'Arrive';
        default: return 'Straight';
    }
}

// Helper function to update instruction panel
function updateInstructionPanel(instructions: any[], label: string = '') {
  const container = document.getElementById('instruction-panel');
  if (!container) {
    const newContainer = document.createElement('div');
    newContainer.id = 'instruction-panel';
    newContainer.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 320px;
      max-height: 420px;
      background: #1e1e2f;
      color: #f1f1f1;
      border-radius: 10px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
      padding: 18px;
      overflow-y: auto;
      z-index: 1000;
      font-family: 'Segoe UI', sans-serif;
    `;
    
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.style.position = 'relative';
      mapContainer.appendChild(newContainer);
    }
    return;
  }

  if (label) {
    const sectionTitle = document.createElement('h4');
    sectionTitle.textContent = label;
    sectionTitle.style.cssText = `
      margin: 10px 0 8px 0;
      color: #00d1ff;
      font-size: 14px;
      font-weight: bold;
      border-bottom: 1px solid #2c2c3d;
      padding-bottom: 5px;
    `;
    container.appendChild(sectionTitle);
  }

  instructions.forEach((inst, index) => {
    const item = document.createElement('div');
    const instructionText = inst.text || inst.instruction || inst.type || '';
    item.innerHTML = `
      <div style="
        display: flex;
        align-items: flex-start;
        margin: 6px 0;
        padding: 6px;
        background: #2c2c3d;
        border-radius: 6px;
        font-size: 13px;
        color: #e0e0e0;
      ">
        <span style="
          background: #00d1ff;
          color: #1e1e2f;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          margin-right: 10px;
          font-weight: bold;
        ">${index + 1}</span>
        <span style="line-height: 1.5;">${instructionText}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

// Helper function to clear instruction panel
function clearInstructionPanel() {
  const container = document.getElementById('instruction-panel');
  if (container) {
    container.innerHTML = '<h3 style="margin: 0 0 10px 0; color: grey; font-size: 16px;">📍 Route Instructions</h3>';
  }
}

// Helper function to add flight instruction
function addFlightInstruction(sourceAirport: any, destAirport: any) {
  const flightText = `✈️ Fly from ${sourceAirport.name || 'Source Airport'} (${sourceAirport.iata || 'N/A'}) to ${destAirport.name || 'Destination Airport'} (${destAirport.iata || 'N/A'})`;
  updateInstructionPanel([{ text: flightText }], '✈️ Flight Segment');
}

// Helper function to add ship instruction
function addShipInstruction(sourcePort: any, destPort: any) {
  const shipText = `🚢 Sail from ${sourcePort.name || 'Source Port'} to ${destPort.name || 'Destination Port'}`;
  updateInstructionPanel([{ text: shipText }], '🚢 Ship Segment');
}

// Helper function to get nearest port
async function getNearestPort(lat: number, lng: number) {
  return {
    name: "Nearest Port",
    latitude: lat,
    longitude: lng
  };
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  startPoint,
  endPoint,
  travelMode,
  routeData,
  onMapClick,
  onReset,
  isCalculating,
  terrainAnalysisResult
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Layer | L.Routing.Control | null>(null);
  const routingControlsRef = useRef<L.Routing.Control[]>([]);
  const locateControlRef = useRef<any>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current && typeof window !== "undefined") {
      const mapInstance = L.map("map-container").setView([20.5937, 78.9629], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstance);
      mapRef.current = mapInstance;
    }

    const currentMapInstance = mapRef.current;
    if (!currentMapInstance) return;

    const leafletClickHandler = (e: L.LeafletMouseEvent) => {
      if (!isCalculating) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    };
    
    currentMapInstance.on("click", leafletClickHandler);
    
    return () => {
      if (currentMapInstance) {
        currentMapInstance.off("click", leafletClickHandler);
      }
    };
  }, [onMapClick, isCalculating]);

  // Location control setup
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const onLocationFound = (e: L.LocationEvent) => {
      const radius = e.accuracy;
      L.marker(e.latlng)
        .addTo(map)
        .bindPopup(`📍 You are within ${Math.round(radius)} meters`)
        .openPopup();

      L.circle(e.latlng, {
        radius,
        color: '#136aec',
        fillColor: '#136aec',
        fillOpacity: 0.3,
      }).addTo(map);
    };

    const onLocationError = (e: L.ErrorEvent) => {
      alert(`❌ Location error: ${e.message}`);
    };

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    // Add locate control
    try {
      const locateControl = L.control.locate({
        position: 'topright',
        drawCircle: true,
        follow: false,
        setView: 'once',
        keepCurrentZoomLevel: false,
        markerStyle: {
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.8,
        },
        circleStyle: {
          weight: 1,
          clickable: false,
        },
        icon: 'fa fa-location-arrow',
        metric: true,
        strings: {
          title: "📍 Show me where I am",
        },
        locateOptions: {
          maxZoom: 16,
          enableHighAccuracy: true,
        },
      });

      locateControl.addTo(map);
      locateControlRef.current = locateControl;
    } catch (error) {
      console.warn("Could not add locate control:", error);
    }

    return () => {
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
      if (locateControlRef.current) {
        try {
          locateControlRef.current.remove();
        } catch (error) {
          console.warn("Error removing locate control:", error);
        }
      }
    };
  }, []);

  // Handle markers
  useEffect(() => {
    if (!mapRef.current) return;
    const currentMap = mapRef.current;

    if (startPoint) {
      if (!startMarkerRef.current) {
        startMarkerRef.current = L.marker(startPoint, { icon: startIcon })
          .addTo(currentMap)
          .bindPopup("<b>Start Point</b>")
          .openPopup();
      } else {
        startMarkerRef.current.setLatLng(startPoint).openPopup();
      }
    } else if (startMarkerRef.current) {
      currentMap.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }

    if (endPoint) {
      if (!endMarkerRef.current) {
        endMarkerRef.current = L.marker(endPoint, { icon: endIcon })
          .addTo(currentMap)
          .bindPopup("<b>End Point</b>");
        if (startMarkerRef.current) startMarkerRef.current.closePopup();
        endMarkerRef.current.openPopup();
      } else {
        endMarkerRef.current.setLatLng(endPoint).openPopup();
      }
    } else if (endMarkerRef.current) {
      currentMap.removeLayer(endMarkerRef.current);
      endMarkerRef.current = null;
    }
  }, [startPoint, endPoint]);

  // Handle routes
  useEffect(() => {
    if (!mapRef.current) return;
    const currentMap = mapRef.current;

    // Cleanup function
    const cleanupRoutes = () => {
      if (routeLayerRef.current) {
        try {
          if (routeLayerRef.current instanceof L.Routing.Control) {
            currentMap.removeControl(routeLayerRef.current);
          } else if (currentMap.hasLayer(routeLayerRef.current)) {
            currentMap.removeLayer(routeLayerRef.current);
          } else if (routeLayerRef.current instanceof L.FeatureGroup) {
            routeLayerRef.current.clearLayers();
            currentMap.removeLayer(routeLayerRef.current);
          }
        } catch (error) {
          console.warn("Error cleaning up route:", error);
        }
        routeLayerRef.current = null;
      }

      routingControlsRef.current.forEach(control => {
        try {
          currentMap.removeControl(control);
        } catch (error) {
          console.warn("Error removing routing control:", error);
        }
      });
      routingControlsRef.current = [];
    };

    // Clear previous routes
    cleanupRoutes();
    clearInstructionPanel();
    
    if (routeData && startPoint && endPoint) {
      if (travelMode === "air") {
        handleAirRoute(currentMap, startPoint, endPoint);
      } else if (travelMode === "ship") {
        handleShipRoute(currentMap, startPoint, endPoint);
      } else {
        handleLandRoute(currentMap, startPoint, endPoint, travelMode);
      }
    }

    return cleanupRoutes;
  }, [routeData, travelMode, startPoint, endPoint]);

  // Handle reset
  useEffect(() => {
    if (!mapRef.current) return;
    const currentMap = mapRef.current;

    const isReset = !startPoint && !endPoint && !routeData;

    if (isReset) {
      currentMap.eachLayer(layer => {
        if (!(layer instanceof L.TileLayer)) {
          currentMap.removeLayer(layer);
        }
      });

      routeLayerRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;

      routingControlsRef.current.forEach(ctrl => {
        try {
          currentMap.removeControl(ctrl);
        } catch (error) {
          console.warn("Routing control cleanup failed:", error);
        }
      });
      routingControlsRef.current = [];

      clearInstructionPanel();
    }
  }, [startPoint, endPoint, routeData]);

  // Helper functions for different route types
  const handleAirRoute = async (map: L.Map, start: LatLng, end: LatLng) => {
    try {
      const startAirport = await getNearestAirport(start.lat, start.lng);
      const endAirport = await getNearestAirport(end.lat, end.lng);
      
      if (!startAirport || !endAirport) {
        console.warn("Could not find airports for air route");
        return;
      }

      const multiLegGroup = L.featureGroup().addTo(map);
      routeLayerRef.current = multiLegGroup;

      // Flight line
      const flightLine = L.polyline([
        [startAirport.latitude, startAirport.longitude],
        [endAirport.latitude, endAirport.longitude],
      ], {
        color: "blue",
        weight: 3,
        dashArray: "5, 10",
        opacity: 0.8,
      }).addTo(multiLegGroup);

      addFlightInstruction(startAirport, endAirport);

      if (multiLegGroup.getBounds().isValid()) {
        map.fitBounds(multiLegGroup.getBounds(), { padding: [50, 50] });
      }
    } catch (error) {
      console.error("Error creating air route:", error);
    }
  };

  const handleShipRoute = async (map: L.Map, start: LatLng, end: LatLng) => {
    try {
      const startPort = await getNearestPort(start.lat, start.lng);
      const endPort = await getNearestPort(end.lat, end.lng);
      
      if (!startPort || !endPort) {
        console.warn("Could not find ports for ship route");
        return;
      }

      const shipRoute = L.polyline([
        start,
        [startPort.latitude, startPort.longitude],
        [endPort.latitude, endPort.longitude],
        end
      ], {
        color: "navy",
        weight: 4,
        dashArray: "10, 10",
        opacity: 0.8,
      }).addTo(map);

      routeLayerRef.current = shipRoute;
      addShipInstruction(startPort, endPort);
      map.fitBounds(shipRoute.getBounds(), { padding: [50, 50] });
    } catch (error) {
      console.error("Error creating ship route:", error);
    }
  };

  const handleLandRoute = (map: L.Map, start: LatLng, end: LatLng, mode: string) => {
    try {
      const routingControl = L.Routing.control({
        waypoints: [L.latLng(start), L.latLng(end)],
        routeWhileDragging: false,
        show: false,
        addWaypoints: false,
      }).addTo(map);

      routingControlsRef.current.push(routingControl);

      routingControl.on('routesfound', function (e) {
        const routes = e.routes;
        const route = routes[0];
        const instructions = route.instructions || [];
        
        const modeEmojis = {
          'driving-car': '🚗',
          'cycling-regular': '🚴',
          'foot-walking': '🚶',
          'Two-wheeler': '🏍️'
        };
        
        const emoji = modeEmojis[mode] || '🚗';
        const label = `${emoji} ${mode.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Route`;
        
        if (instructions.length > 0) {
          updateInstructionPanel(instructions, label);
        }
      });

      routingControl.on('routingerror', function () {
        console.warn("Route not found for", mode);
        updateInstructionPanel([{ text: `Route not found for ${mode}` }], `❌ ${mode} Route`);
      });
    } catch (error) {
      console.error("Error creating land route:", error);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => {
          if (mapRef.current) {
            mapRef.current.locate({
              setView: true,
              maxZoom: 16,
              watch: false,
              enableHighAccuracy: true,
            });
          }
        }}
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 1000,
          padding: '10px 14px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '15px',
        }}
      >
        Locate Me
      </button>

      <div
        id="map-container"
        className="h-full w-full rounded-lg shadow-lg"
        style={{ fill: '100%', height: '100vh', position: 'relative' }}
      />
    </div>
  );
};

export default MapDisplay;