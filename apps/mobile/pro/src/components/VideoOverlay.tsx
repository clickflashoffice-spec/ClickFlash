import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { videoCallService } from '@/services/VideoCallService';
import { ThemedView } from '@/components/themed-view';

export function VideoOverlay() {
  const [isActive, setIsActive] = useState(false);
  const [remoteStream, setRemoteStream] = useState<any>(null);

  useEffect(() => {
    videoCallService.setCallbacks(
      (stream) => setRemoteStream(stream),
      (active) => setIsActive(active)
    );
  }, []);

  if (!isActive) return null;

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      <ThemedView style={styles.videoBox}>
        <View style={styles.header}>
          <Text style={styles.title}>🔴 LIVE: Manager Check-In</Text>
        </View>
        
        {remoteStream && (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        )}

        {/* Picture in Picture Local Feed */}
        {videoCallService.localStream && (
          <RTCView
            streamURL={videoCallService.localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            zOrder={1}
          />
        )}

        <TouchableOpacity 
          style={styles.endButton} 
          onPress={() => videoCallService.endCall()}
        >
          <Text style={styles.endButtonText}>End Call</Text>
        </TouchableOpacity>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 16,
    zIndex: 9999,
  },
  videoBox: {
    width: 200,
    height: 300,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  header: {
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 6,
    alignItems: 'center',
    zIndex: 2,
  },
  title: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  remoteVideo: {
    flex: 1,
  },
  localVideo: {
    position: 'absolute',
    bottom: 40,
    right: 8,
    width: 60,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  endButton: {
    backgroundColor: '#E74C3C',
    padding: 10,
    alignItems: 'center',
  },
  endButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  }
});
