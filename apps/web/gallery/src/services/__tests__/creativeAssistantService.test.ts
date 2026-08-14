import { generateShootIdeas } from '../creativeAssistantService';

describe('creativeAssistantService', () => {
  it('returns three complete subscription-free ideas', async () => {
    const ideas = await generateShootIdeas('Beach resort', 'Golden hour', 'Professional');

    expect(ideas).toHaveLength(3);
    expect(ideas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          settings: expect.objectContaining({
            aperture: expect.any(String),
            shutter_speed: expect.any(String),
            iso: expect.any(String),
          }),
        }),
      ]),
    );
  });

  it('normalizes user input before composing ideas', async () => {
    const [idea] = await generateShootIdeas('  Rooftop   terrace  ', '  Editorial  ', 'Professional');

    expect(idea.title).toBe('Editorial Arrival Story');
    expect(idea.description).toContain('Rooftop terrace');
    expect(idea.description).not.toContain('  ');
  });

  it('uses safe fallbacks for empty inputs', async () => {
    const [idea] = await generateShootIdeas('', '', '');

    expect(idea.title).toBe('timeless resort Arrival Story');
    expect(idea.description).toContain('the selected location');
  });

  it('provides simpler direction for amateur photographers', async () => {
    const [idea] = await generateShootIdeas('Garden', 'Family', 'Amateur');

    expect(idea.description).toContain('Keep the direction simple');
  });
});
