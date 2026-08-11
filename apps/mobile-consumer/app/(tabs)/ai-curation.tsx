import React from 'react';
import { View } from 'react-native';
import { AIGalleryView } from '../../src/components/ui/AIGalleryView';

export default function AICurationScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <AIGalleryView />
    </View>
  );
}
