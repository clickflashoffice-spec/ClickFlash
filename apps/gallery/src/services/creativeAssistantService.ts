import type { ShootIdea } from '../types';

const MAX_INPUT_LENGTH = 80;

function normalizeInput(value: string, fallback: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  return (normalized || fallback).slice(0, MAX_INPUT_LENGTH);
}

/**
 * Produces deterministic, subscription-free photoshoot ideas in the online
 * Gallery client without sending customer or location data to an external model.
 */
export async function generateShootIdeas(
  location: string,
  theme: string,
  photographerExpertise: string,
): Promise<ShootIdea[]> {
  const safeLocation = normalizeInput(location, 'the selected location');
  const safeTheme = normalizeInput(theme, 'timeless resort');
  const safeExpertise = normalizeInput(photographerExpertise, 'Professional');
  const guidance = safeExpertise.toLowerCase() === 'amateur'
    ? 'Keep the direction simple and use one repeatable pose at a time.'
    : 'Layer foreground, subject, and background to create editorial depth.';

  return [
    {
      title: `${safeTheme} Arrival Story`,
      description: `Begin with a wide establishing frame at ${safeLocation}, then move into relaxed portraits as the guests settle into the scene. ${guidance}`,
      settings: {
        aperture: 'f/4',
        shutter_speed: '1/500s',
        iso: '100–400',
      },
    },
    {
      title: `${safeTheme} in Motion`,
      description: `Use walking, fabric movement, or a playful activity at ${safeLocation} to build a candid sequence with a clear beginning, middle, and finish.`,
      settings: {
        aperture: 'f/2.8',
        shutter_speed: '1/1000s',
        iso: '200–800',
      },
    },
    {
      title: `${safeLocation} Detail Collection`,
      description: `Finish with close details, environmental textures, and quiet expressions that reinforce the ${safeTheme} theme and give the album visual rhythm.`,
      settings: {
        aperture: 'f/2–f/2.8',
        shutter_speed: '1/250s',
        iso: '200–1000',
      },
    },
  ];
}
