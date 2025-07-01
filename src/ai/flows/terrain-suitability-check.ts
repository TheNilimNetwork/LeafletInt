'use server';
/**
 * @fileOverview Determines whether the selected travel mode is suitable for the calculated route, considering elevation changes and terrain difficulty.
 *
 * - terrainSuitabilityCheck - A function that checks the terrain suitability for a given route and travel mode.
 * - TerrainSuitabilityCheckInput - The input type for the terrainSuitabilityCheck function.
 * - TerrainSuitabilityCheckOutput - The return type for the terrainSuitabilityCheck function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TerrainSuitabilityCheckInputSchema = z.object({
  travelMode: z
    .enum(['driving-car', 'cycling-regular', 'foot-walking', 'air', 'ship']) // Added 'ship'
    .describe('The selected mode of travel.'),
  routeDescription: z
    .string()
    .describe('A description of the route, including elevation changes and terrain type.'),
});
export type TerrainSuitabilityCheckInput = z.infer<typeof TerrainSuitabilityCheckInputSchema>;

const TerrainSuitabilityCheckOutputSchema = z.object({
  isSuitable: z
    .boolean()
    .describe('Whether the selected travel mode is suitable for the route.'),
  advice: z.string().describe('Advice on whether the selected travel mode is suitable for the route, considering elevation changes and terrain difficulty.'),
});
export type TerrainSuitabilityCheckOutput = z.infer<typeof TerrainSuitabilityCheckOutputSchema>;

export async function terrainSuitabilityCheck(
  input: TerrainSuitabilityCheckInput
): Promise<TerrainSuitabilityCheckOutput> {
  return terrainSuitabilityCheckFlow(input);
}

const prompt = ai.definePrompt({
  name: 'terrainSuitabilityCheckPrompt',
  input: {schema: TerrainSuitabilityCheckInputSchema},
  output: {schema: TerrainSuitabilityCheckOutputSchema},
  prompt: `You are an expert travel advisor. A user has selected a travel mode and a route. You will analyze the route description and determine whether the selected travel mode is suitable for the route, taking into account elevation changes and terrain difficulty.

Travel Mode: {{{travelMode}}}
Route Description: {{{routeDescription}}}

Based on this information, provide advice to the user on whether their selected travel mode is suitable. Consider elevation changes, terrain difficulty, and the capabilities of the selected travel mode. Set isSuitable to true if the travel mode is suitable, and false otherwise.
`,
});

const terrainSuitabilityCheckFlow = ai.defineFlow(
  {
    name: 'terrainSuitabilityCheckFlow',
    inputSchema: TerrainSuitabilityCheckInputSchema,
    outputSchema: TerrainSuitabilityCheckOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
