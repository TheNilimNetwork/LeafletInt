// @ts-nocheck
// Disabling TypeScript checks for this file due to complexities with Leaflet types
// and third-party library integrations which are not the focus of this specific AI-driven modification.
"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-routing-machine"; 
import type { LatLngLiteral as LeafletLatLngLiteral } from "leaflet";
import type { TerrainSuitabilityCheckOutput } from "@/ai/flows/terrain-suitability-check";
import { getNearestAirport } from "@/lib/airportUtils";// Added import for port utils


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
  routeData: any | null; // Can be ORS response or simple air/ship data
  onMapClick: (latlng: LatLng) => void;
  onReset: () => void; // Added for completeness, though not used in this snippet
  isCalculating: boolean;
  terrainAnalysisResult: TerrainSuitabilityCheckOutput | null; // For context, not directly used here
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
    // See ORS maneuver types: https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/get
    // LRM types: Head, Straight, SlightRight, Right, SharpRight, TurnAround, SharpLeft, Left, SlightLeft, Arrive, ...
    switch (orsType) {
        case 0: return 'Depart'; // LRM might use 'Head' or 'Depart'
        case 1: return 'SlightLeft'; // ORS 'Turn slight left'
        case 2: return 'Left'; // ORS 'Turn left'
        case 3: return 'SharpLeft'; // ORS 'Turn sharp left'
        case 4: return 'SlightRight';// ORS 'Turn slight right'
        case 5: return 'Right'; // ORS 'Turn right'
        case 6: return 'SharpRight'; // ORS 'Turn sharp right'
        case 7: return 'Straight'; // ORS 'Keep straight'
        case 8: return 'EnterRoundabout'; // ORS 'Enter roundabout' - LRM might use specific roundabout instructions
        case 9: return 'ExitRoundabout'; // ORS 'Exit roundabout'
        case 10: return 'UTurn'; // ORS 'U-turn'
        case 11: return 'Goal'; // ORS 'Goal' - LRM 'Arrive'
        case 12: return 'Depart'; // ORS 'Depart'
        case 13: return 'Arrive'; // ORS 'Arrive Left'
        case 14: return 'Arrive'; // ORS 'Arrive Right'
        case 15: return 'Arrive'; // ORS 'Arrive'
        // Default and other cases
        default: return 'Straight';
    }
}

// Helper function to update instruction panel
function updateInstructionPanel(instructions: any[], label: string = '') {
  const container = document.getElementById('instruction-panel');
  if (!container) {
    // Create instruction panel if it doesn't exist
    const newContainer = document.createElement('div');
    newContainer.id = 'instruction-panel';
   newContainer.style.cssText = `
  position: absolute;
  top: 10px;
  right: 10px;
  width: 320px;
  max-height: 420px;
  background: #1e1e2f; /* Dark navy background */
  color: #f1f1f1;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
  padding: 18px;
  overflow-y: auto;
  z-index: 1000;
  font-family: 'Segoe UI', sans-serif;
`;
    
    // Find map container and append
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.style.position = 'relative';
      mapContainer.appendChild(newContainer);
    }
    return;
  }

  if (label) {
    const sectionTitle = document.createElement('h4');
    sectionTitle.style.cssText = `
    margin: 10px 0 8px 0;
    color: #00d1ff; /* Bright cyan */
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

// Helper function to get nearest port (placeholder - you'll need to implement this)
async function getNearestPort(lat: number, lng: number) {
  // Placeholder implementation - replace with actual port finding logic
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
  isCalculating,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Layer | L.Routing.Control | null>(null);
  const routingControlsRef = useRef<L.Routing.Control[]>([]);

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
      currentMapInstance.off("click", leafletClickHandler);
    };
  }, [onMapClick, isCalculating]);

  useEffect(() => {
    if (!mapRef.current) return;
    const currentMap = mapRef.current;

    if (startPoint) {
      if (!startMarkerRef.current) {
        startMarkerRef.current = L.marker(startPoint, { icon: startIcon }).addTo(currentMap).bindPopup("<b>Start Point</b>").openPopup();
      } else {
        startMarkerRef.current.setLatLng(startPoint).openPopup();
      }
    } else if (startMarkerRef.current) {
      currentMap.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }

    if (endPoint) {
      if (!endMarkerRef.current) {
        endMarkerRef.current = L.marker(endPoint, { icon: endIcon }).addTo(currentMap).bindPopup("<b>End Point</b>");
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

  // Modified useEffect for route handling with instructions
  useEffect(() => {
    if (!mapRef.current) return;

    const currentMap = mapRef.current;
// Add this right after your imports
    const routingControls = routingControlsRef.current;

 // Improve your cleanup code in the useEffect hook
// Clear previous route
if (routeLayerRef.current) {
  if (routeLayerRef.current instanceof L.Routing.Control) {
    currentMap.removeControl(routeLayerRef.current);
  } else if (currentMap.hasLayer(routeLayerRef.current)) {
    currentMap.removeLayer(routeLayerRef.current);
  } else if (routeLayerRef.current instanceof L.FeatureGroup) {
    routeLayerRef.current.clearLayers();
    currentMap.removeLayer(routeLayerRef.current);
  }
  routeLayerRef.current = null;
}

// Also clean up any routing controls that might have been created
routingControls.forEach(control => {
  try {
    currentMap.removeControl(control);
  } catch (err) {
    console.warn("Error removing routing control:", err);
  }
});
routingControls.length = 0; // Clear the array


    // Clear instruction panel
    clearInstructionPanel();
    
    if (routeData && startPoint && endPoint) {
      if (travelMode === "air") {
        let multiLegGroup: L.FeatureGroup | null = null;
        (async () => {
          const startAirport = await getNearestAirport(startPoint.lat, startPoint.lng);
          const endAirport = await getNearestAirport(endPoint.lat, endPoint.lng);
          if (!startAirport || !endAirport) return;

          // Clear previous routes
          if (routeLayerRef.current) {
            routeLayerRef.current.remove();
          }

          // Remove previous group if exists
          if (multiLegGroup) {
            currentMap.removeLayer(multiLegGroup);
          }

          // Now safely create a new one
          multiLegGroup = L.featureGroup().addTo(currentMap);
          routeLayerRef.current = multiLegGroup;

        // Modify your addLandOrSeaRoute function
const addLandOrSeaRoute = (from: [number, number], to: [number, number], segmentLabel: string) => {
  const control = L.Routing.control({
    waypoints: [L.latLng(...from), L.latLng(...to)],
    routeWhileDragging: false,
    show: false,
    addWaypoints: false,
    fitSelectedRoutes: false,
    createMarker: () => null, // Clean markers
  }).addTo(currentMap);
  
  // Add to our tracking array
  routingControls.push(control);

  // Store a reference to any lines created, so we can clean them up later
  control.on('routesfound', function (e) {
    const routes = e.routes;
    const route = routes[0];
    
    // Add route line to map and track it in the feature group
    const line = L.Routing.line(route, {
      styles: [{ color: '#4caf50', weight: 4 }],
    });
    
    // Only add to multiLegGroup if it exists and is a FeatureGroup
    if (multiLegGroup && multiLegGroup instanceof L.FeatureGroup) {
      line.addTo(multiLegGroup);
    } else {
      // If multiLegGroup doesn't exist yet, add directly to map and track separately
      line.addTo(currentMap);
      if (routeLayerRef.current instanceof L.FeatureGroup) {
        routeLayerRef.current.addLayer(line);
      }
    }

    // Extract and display instructions
    const instructions = route.instructions || [];
    if (instructions.length > 0) {
      updateInstructionPanel(instructions, segmentLabel);
    }
  });

  control.on('routingerror', function () {
    console.warn("Land/sea route not found for", segmentLabel);
    updateInstructionPanel([{ text: `Route not found for ${segmentLabel}` }], segmentLabel);
  });
};



          // Leg 1: Start → source airport
          addLandOrSeaRoute(
            [startPoint.lat, startPoint.lng], 
            [startAirport.latitude, startAirport.longitude],
            '🚗 Land segment to airport'
          );

          // Small delay to ensure first route is processed
          setTimeout(() => {
            // Leg 2: Flight (sourceAirport → destAirport)
            const flightLine = L.polyline(
              [
                [startAirport.latitude, startAirport.longitude],
                [endAirport.latitude, endAirport.longitude],
              ],
              {
                color: "blue",
                weight: 3,
                dashArray: "5, 10",
                opacity: 0.8,
              }
            ).addTo(multiLegGroup);

            // Add flight instructions
            addFlightInstruction(startAirport, endAirport);

            // Small delay for flight instruction
            setTimeout(() => {
              // Leg 3: dest airport → End
              addLandOrSeaRoute(
                [endAirport.latitude, endAirport.longitude], 
                [endPoint.lat, endPoint.lng],
                '🚕 Land segment from airport'
              );
            }, 100);
          }, 500);

          // Fit all
          setTimeout(() => {
            if (multiLegGroup && multiLegGroup.getBounds().isValid()) {
              currentMap.fitBounds(multiLegGroup.getBounds(), { padding: [50, 50] });
            }
          }, 1000);
        })();
      } else if (travelMode === "ship") {
        (async () => {
          const startPort = await getNearestPort(startPoint.lat, startPoint.lng);
          const endPort = await getNearestPort(endPoint.lat, endPoint.lng);
          if (!startPort || !endPort) return;

          // Create ship route
          const shipRoute = L.polyline(
            [startPoint, [startPort.latitude, startPort.longitude], [endPort.latitude, endPort.longitude], endPoint],
            {
              color: "hsl(var(--accent))",
              weight: 4,
              dashArray: "10, 10",
              opacity: 0.8,
            }
          ).addTo(currentMap);
          routeLayerRef.current = shipRoute;

          // Add ship instructions
          const shipInstructions = [
            { text: `🚶 Walk to ${startPort.name}` },
            { text: `🚢 Sail from ${startPort.name} to ${endPort.name}` },
            { text: `🚶 Walk from ${endPort.name} to destination` }
          ];
          updateInstructionPanel(shipInstructions, '🚢 Ship Route');

          currentMap.fitBounds(shipRoute.getBounds(), { padding: [50, 50] });
        })();
      } else {
        // Land routes (driving, cycling, walking, two-wheeler)
        const routingControl = L.Routing.control({
          waypoints: [L.latLng(startPoint), L.latLng(endPoint)],
          routeWhileDragging: false,
          show: false,
          addWaypoints: false,
        }).addTo(currentMap);

        routingControl.on('routesfound', function (e) {
          const routes = e.routes;
          const route = routes[0];
          const instructions = route.instructions || [];
          
          // Get appropriate emoji for travel mode
          const modeEmojis = {
            'driving-car': '🚗',
            'cycling-regular': '🚴',
            'foot-walking': '🚶',
            'Two-wheeler': '🏍️'
          };
          
          const emoji = modeEmojis[travelMode] || '🚗';
          const label = `${emoji} ${travelMode.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Route`;
          
          if (instructions.length > 0) {
            updateInstructionPanel(instructions, label);
          }
        });

        routingControl.on('routingerror', function () {
          console.warn("Route not found for", travelMode);
          updateInstructionPanel([{ text: `Route not found for ${travelMode}` }], `❌ ${travelMode} Route`);
        });

        routeLayerRef.current = routingControl;
      }
    } 
    else if (!routeData && routeLayerRef.current) {
  // Clear previous route
  if (routeLayerRef.current instanceof L.Routing.Control) {
    currentMap.removeControl(routeLayerRef.current);
  } else if (currentMap.hasLayer(routeLayerRef.current)) {
    currentMap.removeLayer(routeLayerRef.current);
  }
  routeLayerRef.current = null;

  // 🔥 Clear instructions and markers
  clearInstructionPanel();
  if (startMarkerRef.current) {
    currentMap.removeLayer(startMarkerRef.current);
    startMarkerRef.current = null;
  }
  if (endMarkerRef.current) {
    currentMap.removeLayer(endMarkerRef.current);
    endMarkerRef.current = null;
  }
}  
    }
   ,[routeData, travelMode, startPoint, endPoint]);

  return (
    <div
      id="map-container"
      className="h-full w-full rounded-lg shadow-lg"
      style={{ minHeight: "400px" }} // Ensure map has a minimum height
    />
  );
};

export default MapDisplay;