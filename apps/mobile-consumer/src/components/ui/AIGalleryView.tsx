import React from 'react';
import { View, StyleSheet, Text, ScrollView, Image } from 'react-native';
import { GlassPanel } from './GlassPanel';
import { FluidButton } from './FluidButton';

interface PhotoGroup {
  id: string;
  title: string;
  subtitle: string;
  coverImage: string;
  photoCount: number;
}

const mockGroups: PhotoGroup[] = [
  {
    id: '1',
    title: 'Best Smiles',
    subtitle: 'AI Selected',
    coverImage: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=600&auto=format&fit=crop',
    photoCount: 12,
  },
  {
    id: '2',
    title: 'Group Shots',
    subtitle: 'Everyone looking',
    coverImage: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=600&auto=format&fit=crop',
    photoCount: 5,
  }
];

export function AIGalleryView() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Your AI Collection</Text>
      <Text style={styles.headerSubtitle}>Curated automatically by ClickFlash AI</Text>

      <View style={styles.grid}>
        {mockGroups.map((group) => (
          <View key={group.id} style={styles.groupCard}>
            <Image source={{ uri: group.coverImage }} style={styles.coverImage} />
            <View style={styles.overlay}>
              <GlassPanel style={styles.glassInfo}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Text style={styles.groupSubtitle}>{group.subtitle} • {group.photoCount} photos</Text>
              </GlassPanel>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actionContainer}>
        <FluidButton variant="primary">
          <Text style={styles.btnTextPrimary}>Find My Face</Text>
        </FluidButton>
        <FluidButton variant="glass" style={{ marginTop: 12 }}>
          <Text style={styles.btnTextSecondary}>View All Photos</Text>
        </FluidButton>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    marginTop: 8,
    marginBottom: 32,
  },
  grid: {
    gap: 20,
  },
  groupCard: {
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: 16,
  },
  glassInfo: {
    padding: 16,
    alignItems: 'flex-start',
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  groupSubtitle: {
    fontSize: 14,
    color: '#e0e0e0',
    marginTop: 4,
  },
  actionContainer: {
    marginTop: 40,
    paddingBottom: 40,
  },
  btnTextPrimary: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  btnTextSecondary: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
