import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { FaceSearchMatch } from '../../lib/faceSearchClient';
import { getFaceSearchMatches } from '../../lib/gallerySession';

interface DisplayPhoto {
  id: string;
  uri: string;
}

function stringField(
  match: FaceSearchMatch,
  names: readonly string[],
): string | null {
  for (const name of names) {
    const value = match[name];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function toDisplayPhoto(match: FaceSearchMatch, index: number): DisplayPhoto | null {
  const uri = stringField(match, [
    'thumbnailUrl',
    'thumbnail_url',
    'previewUrl',
    'preview_url',
    'imageUrl',
    'image_url',
    'url',
  ]);
  if (!uri) return null;

  return {
    id: stringField(match, ['id', 'photoId', 'photo_id']) ?? `match-${index}`,
    uri,
  };
}

export default function GalleryScreen() {
  const matches = getFaceSearchMatches();
  const photos = matches
    .map(toDisplayPhoto)
    .filter((photo): photo is DisplayPhoto => photo !== null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Photos</Text>
        <Text style={styles.subtitle}>
          {matches.length === 0
            ? 'No face-search matches loaded'
            : `${matches.length} server-confirmed match${matches.length === 1 ? '' : 'es'}`}
        </Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Search your event</Text>
          <Text style={styles.emptyBody}>
            Open Face Search and take a selfie. This screen only displays results
            returned by the authenticated event search.
          </Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Matches found</Text>
          <Text style={styles.emptyBody}>
            The server returned matches without displayable preview URLs. No sample
            photos have been substituted.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.imageContainer}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 4,
  },
  emptyState: {
    marginHorizontal: 20,
    marginTop: 40,
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#1f2937',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyBody: {
    color: '#d1d5db',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
  },
  imageContainer: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 2,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});
