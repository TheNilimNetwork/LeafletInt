# **App Name**: GeoRoute Navigator

## Core Features:

- Interactive Map: Interactive map display using Leaflet, allowing users to select start and end points by clicking on the map.
- Travel Mode Selection: Mode of travel selection, allowing users to choose between car, bike, foot or air for route calculation.
- Route Calculation: Calculates optimal route considering geographic factors like elevation and terrain, using OpenRouteService API. API Key to be used to fetch the coordinates
- Terrain Analysis: Integrate a generative AI powered 'Terrain Consideration Tool'. It advises whether the selected travel mode is suitable for the calculated route, considering elevation changes and terrain. 

## Style Guidelines:

- Primary color: Saturated blue (#4287f5) to represent reliability and navigation.
- Background color: Light gray (#f0f2f5), creating a clean and modern look.
- Accent color: Complementary orange (#ff9800) to highlight interactive elements and CTAs.
- Body and headline font: 'Inter', sans-serif for a modern and readable UI.
- Use simple, clear icons from a library like FontAwesome for travel modes and other actions.
- Keep the controls panel translucent and overlayed on the map to maximize map visibility.
- Implement subtle animations, like a smooth transition when calculating routes.