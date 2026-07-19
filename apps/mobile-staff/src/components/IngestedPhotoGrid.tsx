import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LocalPhotoQueue, QueuedPhoto } from '../services/LocalPhotoQueue';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/tokens';

interface PhotoRowProps {
  item: QueuedPhoto;
}

const PhotoRow: React.FC<PhotoRowProps> = memo(({ item }) => (
  <View style={styles.photoContainer}>
    <Image source={{ uri: item.localPath }} style={styles.image} contentFit="cover" transition={200} />
    <View style={styles.overlay}>
      {item.status === 'uploading' ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : item.status === 'failed' ? (
        <Ionicons name="warning" size={18} color={theme.colors.danger} />
      ) : item.status === 'completed' ? (
        <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
      ) : (
        <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.textHeader} />
      )}
    </View>
  </View>
));
PhotoRow.displayName = 'PhotoRow';

export const IngestedPhotoGrid: React.FC = memo(() => {
  const [photos, setPhotos] = useState<QueuedPhoto[]>([]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const pending = await LocalPhotoQueue.getPendingPhotos();
        setPhotos(pending);
      } catch (e) {}
    };
    fetchPhotos();
    const interval = setInterval(fetchPhotos, 2000);
    return () => clearInterval(interval);
  }, []);

  const renderItem = useCallback(({ item }: { item: QueuedPhoto }) => (
    <PhotoRow item={item} />
  ), []);

  const keyExtractor = useCallback((item: QueuedPhoto) => item.id, []);

  if (photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="camera-outline" size={44} color={theme.colors.textSubtle} />
        <Text style={styles.emptyTitle}>Ingestion Queue Empty</Text>
        <Text style={styles.emptySubtitle}>Shots captured over USB/Wi-Fi PTP will appear here automatically.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={photos}
      keyExtractor={keyExtractor}
      numColumns={3}
      renderItem={renderItem}
      contentContainerStyle={styles.grid}
      removeClippedSubviews={true}
      maxToRenderPerBatch={12}
      windowSize={5}
    />
  );
});
IngestedPhotoGrid.displayName = 'IngestedPhotoGrid';

const styles = StyleSheet.create({
  grid: {
    padding: 2,
  },
  photoContainer: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 2,
    position: 'relative',
  },
  image: {
    flex: 1,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.elevated,
  },
  overlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(7, 10, 18, 0.75)',
    borderRadius: theme.borderRadius.sm,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyTitle: {
    color: theme.colors.textHeader,
    fontSize: 15,
    fontWeight: '700',
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    color: theme.colors.textSubtle,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  }
});
