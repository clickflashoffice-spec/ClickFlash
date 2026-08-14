import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';

const SOUNDTRACKS = [
  { id: 'track-1', name: '🌴 Tropical Sunset Chill', duration: '15s', vibe: 'Relaxed & Sunny' },
  { id: 'track-2', name: '✨ Luxury Resort Aesthetic', duration: '30s', vibe: 'Cinematic Piano' },
  { id: 'track-3', name: '🌊 Ocean Wave Beat', duration: '15s', vibe: 'Upbeat Electronic' },
  { id: 'track-4', name: '🎸 Acoustic Beach Vibes', duration: '20s', vibe: 'Warm & Organic' },
];

const TEMPLATES = [
  { id: 'temp-1', name: 'Dynamic Beat Sync', description: 'Fast snappy cuts synced to the music drop' },
  { id: 'temp-2', name: 'Cinematic Slow Pan', description: 'Gentle zoom and fade transitions' },
  { id: 'temp-3', name: 'Polaroid Memories', description: 'Vintage photo frames with handwritten titles' },
];

interface BrandedReelGeneratorModalProps {
  visible: boolean;
  onClose: () => void;
  photoCount?: number;
}

export function BrandedReelGeneratorModal({
  visible,
  onClose,
  photoCount = 8,
}: BrandedReelGeneratorModalProps) {
  const [selectedTrack, setSelectedTrack] = useState(SOUNDTRACKS[0].id);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedVideoUrl('https://clickflash-storage.internal/reels/generated-story-104.mp4');
    }, 2500);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>🎬 AI Memory Reel</Text>
            <Text style={styles.headerSubtitle}>Auto-create TikTok & Instagram Story video</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Status Badge */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              ✨ {photoCount} photos selected from your session will be auto-edited and stitched.
            </Text>
          </View>

          {/* Soundtrack Selection */}
          <Text style={styles.sectionTitle}>SELECT SOUNDTRACK</Text>
          <View style={styles.trackList}>
            {SOUNDTRACKS.map((track) => {
              const isSelected = selectedTrack === track.id;
              return (
                <TouchableOpacity
                  key={track.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedTrack(track.id)}
                  style={[styles.trackCard, isSelected && styles.trackCardActive]}
                >
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackName}>{track.name}</Text>
                    <Text style={styles.trackMeta}>
                      {track.vibe} • {track.duration}
                    </Text>
                  </View>
                  <View style={[styles.radioDot, isSelected && styles.radioDotActive]} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Template Style */}
          <Text style={styles.sectionTitle}>TRANSITION STYLE</Text>
          <View style={styles.templateList}>
            {TEMPLATES.map((tmpl) => {
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <TouchableOpacity
                  key={tmpl.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedTemplate(tmpl.id)}
                  style={[styles.templateCard, isSelected && styles.templateCardActive]}
                >
                  <Text style={styles.templateName}>{tmpl.name}</Text>
                  <Text style={styles.templateDesc}>{tmpl.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Result Area */}
          {generatedVideoUrl ? (
            <View style={styles.successArea}>
              <Text style={styles.successTitle}>🎉 Reel Ready to Share!</Text>
              <Text style={styles.successDesc}>High-definition 1080x1920 MP4 rendered with audio.</Text>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => {
                  alert('Sharing to Instagram Stories...');
                  onClose();
                }}
              >
                <Text style={styles.shareBtnText}>📲 Share to Instagram / TikTok</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
              disabled={isGenerating}
              onPress={handleGenerate}
            >
              {isGenerating ? (
                <View style={styles.generatingRow}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.generateBtnText}> Rendering 4K Reel...</Text>
                </View>
              ) : (
                <Text style={styles.generateBtnText}>⚡ Generate 15s Video Reel</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#27272a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#93c5fd',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#71717a',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 10,
  },
  trackList: {
    gap: 8,
    marginBottom: 16,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  trackCardActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#1e1b4b',
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  trackMeta: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2,
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#52525b',
  },
  radioDotActive: {
    borderColor: '#a855f7',
    backgroundColor: '#a855f7',
  },
  templateList: {
    gap: 8,
    marginBottom: 24,
  },
  templateCard: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  templateCardActive: {
    borderColor: '#06b6d4',
    backgroundColor: '#083344',
  },
  templateName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  templateDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  generateBtn: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successArea: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  successDesc: {
    fontSize: 13,
    color: '#a7f3d0',
    marginTop: 4,
    textAlign: 'center',
  },
  shareBtn: {
    backgroundColor: '#10b981',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  shareBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
