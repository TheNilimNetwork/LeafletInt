import { LatLng } from "@/app/page";
import { getNearestAirport } from "./airportUtils";
import { getOpenRouteServiceRoute } from "@/app/actions/getRoute";

export async function buildAirTravelRoute(start: LatLng, end: LatLng) {
  const startAirport = await getNearestAirport(start.lat, start.lng);
  const endAirport = await getNearestAirport(end.lat, end.lng);

  if (!startAirport || !endAirport) return null;

  // For now, hardcode mode as 'driving-car'. Replace later if terrain AI is needed.
  const toAirportMode = 'driving-car';
  const fromAirportMode = 'driving-car';

  const leg1Result = await getOpenRouteServiceRoute({
    start,
    end: { lat: startAirport.lat as number, lng: startAirport.lon as number },
    mode: toAirportMode,
  });

  const leg3Result = await getOpenRouteServiceRoute({
    start: { lat: endAirport.lat as number, lng: endAirport.lon as number },
    end,
    mode: fromAirportMode,
  });

  if (!leg1Result.success || !leg3Result.success) return null;

  const leg1 = {
    geometry: leg1Result.data.routes[0].geometry,
    properties: { mode: toAirportMode }
  };

  const leg2 = {
    geometry: {
      coordinates: [
        [startAirport.lon, startAirport.lat],
        [endAirport.lon, endAirport.lat]
      ],
    },
    properties: { mode: 'air' }
  };

  const leg3 = {
    geometry: leg3Result.data.routes[0].geometry,
    properties: { mode: fromAirportMode }
  };

  return [leg1, leg2, leg3];
}
