const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());

let airports = [];

// Utility function for distance
function haversineDistance(lat1, lon1, lat2, lon2) {
  function toRad(x) {
    return (x * Math.PI) / 180;
  }

  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Route handler
app.get('/nearest-airport', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lng);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: 'Invalid lat/lon' });
  }

  if (airports.length === 0) {
    return res.status(503).json({ error: 'Airport data not loaded yet' });
  }

  let nearest = null;
  let minDistance = Infinity;

  for (const airport of airports) {
    const distance = haversineDistance(lat, lon, airport.latitude, airport.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...airport, distance_km: distance.toFixed(2) };
    }
  }

  if (nearest) {
    res.json({ airport: nearest });
  } else {
    res.status(404).json({ error: 'No airport found' });
  }
});

// Read CSV first, then start server
const csvFilePath = path.join(__dirname, 'data/airports.csv');

fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
  // Accept only large/medium/small airports (skip heliports, seaplane bases, etc.)
  const validTypes = ['large_airport', 'medium_airport'];
  if (!validTypes.includes(row.type)) return;

  // Ensure coordinates are valid
  const lat = parseFloat(row.latitude_deg);
  const lon = parseFloat(row.longitude_deg);
  if (isNaN(lat) || isNaN(lon)) return;

  airports.push({
    id: row.id,
    name: row.name,
    iata: row.ident || row.iata_code,
    latitude: lat,
    longitude: lon,
    type: row.type,
    iso_country: row.iso_country,
  });
})
.on('end', () => {
  console.log(`✅ Loaded ${airports.length} airports.`);

  // ✅ Start the server AFTER CSV is loaded
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
})
.on('error', (err) => {
  console.error('❌ Error reading CSV:', err);
});