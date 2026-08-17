import { describe, it, expect } from 'vitest';
import { NlpSemanticSearchService } from '../NlpSemanticSearchService';
import type { Photo, NlpSemanticQuery } from '@clickflash/types';

describe('Consumer Mobile NlpSemanticSearchService', () => {
  const mockPhotos: Photo[] = [
    {
      id: 'p1',
      albumId: 'album_01',
      photographerId: 'photog_01',
      hotelId: 'hotel_01',
      capturedAt: '2026-08-17T12:00:00Z',
      resolution: 24,
      size: 4500000,
      url: 'https://example.com/p1.jpg',
      title: 'Thunder Coaster Inversion',
      category: 'COASTER_LOOP',
      aiTags: {
        clothing_colors: ['red', 'blue'],
        accessories: ['sunglasses'],
        context: 'screaming with joy at apex'
      },
      quality_flags: ['high_quality'],
      thumbnailUrl: 'https://example.com/p1_thumb.jpg',
      previewUrl: 'https://example.com/p1_prev.jpg',
      watermarkUrl: 'https://example.com/p1_wm.jpg',
      createdAt: '2026-08-17T12:00:00Z',
      updatedAt: '2026-08-17T12:00:00Z'
    },
    {
      id: 'p2',
      albumId: 'album_01',
      photographerId: 'photog_01',
      hotelId: 'hotel_01',
      capturedAt: '2026-08-17T12:05:00Z',
      resolution: 24,
      size: 4200000,
      url: 'https://example.com/p2.jpg',
      title: 'Water Rapids Splash',
      category: 'WATER_SPLASH',
      aiTags: {
        clothing_colors: ['yellow'],
        accessories: ['poncho'],
        context: 'water spraying everywhere'
      },
      quality_flags: ['high_quality'],
      thumbnailUrl: 'https://example.com/p2_thumb.jpg',
      previewUrl: 'https://example.com/p2_prev.jpg',
      watermarkUrl: 'https://example.com/p2_wm.jpg',
      createdAt: '2026-08-17T12:05:00Z',
      updatedAt: '2026-08-17T12:05:00Z'
    }
  ];

  it('ranks coaster photo highest for roller coaster search query', () => {
    const query: NlpSemanticQuery = {
      queryText: 'red sunglasses coaster',
      minSimilarity: 0.1,
      maxResults: 10
    };

    const results = NlpSemanticSearchService.searchPhotos(mockPhotos, query);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].photo.id).toBe('p1');
    expect(results[0].matchedTags).toContain('item:sunglasses');
    expect(results[0].matchedTags).toContain('color:red');
  });

  it('filters results by minimum similarity threshold', () => {
    const query: NlpSemanticQuery = {
      queryText: 'yellow poncho water',
      minSimilarity: 0.5,
      maxResults: 5
    };

    const results = NlpSemanticSearchService.searchPhotos(mockPhotos, query);
    expect(results).toHaveLength(1);
    expect(results[0].photo.id).toBe('p2');
  });
});
