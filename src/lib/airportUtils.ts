// Frontend utility to call the backend API for nearest airport
export interface NearestAirportResponse {
  airport: Airport;
}

export interface Airport {
  id: string;
  name: string;
  iata: string;
  icao: string;
  lat: number;
  lng: number;
  [key: string]: unknown; // In case there are extra fields
}

export async function getNearestAirport(lat: number, lng: number): Promise<Airport> {
  try {
    const response = await fetch(`http://localhost:3001/nearest-airport?lat=${lat}&lng=${lng}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: NearestAirportResponse = await response.json();
    return data.airport;
  } catch (error) {
    console.error('Error fetching nearest airport:', error);
    throw error;
  }
}