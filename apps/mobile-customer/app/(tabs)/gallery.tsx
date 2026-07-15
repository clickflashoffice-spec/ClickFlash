import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';

export default function GalleryScreen() {
  // Mock images for demonstration
  const mockPhotos = Array(12).fill(null).map((_, i) => ({
    id: i.toString(),
    uri: `https://picsum.photos/seed/${i}/400/400`
  }));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Photos</Text>
        <Text style={styles.subtitle}>Found 12 matches</Text>
      </View>
      
      <View style={styles.grid}>
        {mockPhotos.map((photo) => (
          <View key={photo.id} style={styles.imageContainer}>
            <Image 
              source={{ uri: photo.uri }} 
              style={styles.image}
              resizeMode="cover"
            />
            {/* Watermark overlay mock */}
            <View style={styles.watermark}>
              <Text style={styles.watermarkText}>ClickFlash</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#111827',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
  },
  imageContainer: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 2,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  watermark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  watermarkText: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 'bold',
    fontSize: 12,
    transform: [{ rotate: '-45deg' }],
  }
});
