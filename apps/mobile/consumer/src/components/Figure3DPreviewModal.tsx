import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

interface Figure3DPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  photoUrl?: string;
  photoId?: string;
}

export const Figure3DPreviewModal: React.FC<Figure3DPreviewModalProps> = ({
  visible,
  onClose,
  photoUrl,
  photoId,
}) => {
  const [style, setStyle] = useState<'realistic' | 'cartoon' | 'chibi'>('realistic');
  const [material, setMaterial] = useState<'resin' | 'fullcolor'>('resin');
  const [isRendering, setIsRendering] = useState(false);

  const price = material === 'fullcolor' ? 79 : 49;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>AI 3D Figurine Studio</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 3D WebGL / Turntable Simulation Container */}
          <View style={styles.previewBox}>
            {isRendering ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#ec4899" />
                <Text style={styles.renderingText}>Generating High-Poly 3D Mesh...</Text>
              </View>
            ) : (
              <View style={styles.centerBox}>
                <Text style={styles.modelIcon}>🗿</Text>
                <Text style={styles.badge}>360° TURNTABLE PREVIEW</Text>
                <Text style={styles.styleLabel}>Style: {style.toUpperCase()} | Material: {material.toUpperCase()}</Text>
              </View>
            )}
          </View>

          {/* Style Selector */}
          <Text style={styles.sectionLabel}>Select Figurine Aesthetic</Text>
          <View style={styles.tabRow}>
            {(['realistic', 'cartoon', 'chibi'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.tab, style === s && styles.activeTab]}
                onPress={() => setStyle(s)}
              >
                <Text style={[styles.tabText, style === s && styles.activeTabText]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Material Selector */}
          <Text style={styles.sectionLabel}>Select Material</Text>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, material === 'resin' && styles.activeTab]}
              onPress={() => setMaterial('resin')}
            >
              <Text style={[styles.tabText, material === 'resin' && styles.activeTabText]}>
                HD Resin (€49)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, material === 'fullcolor' && styles.activeTab]}
              onPress={() => setMaterial('fullcolor')}
            >
              <Text style={[styles.tabText, material === 'fullcolor' && styles.activeTabText]}>
                Full-Color Sandstone (€79)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer CTA */}
          <View style={styles.footer}>
            <View>
              <Text style={styles.priceLabel}>Total Price</Text>
              <Text style={styles.priceValue}>€{price}</Text>
            </View>
            <TouchableOpacity
              style={styles.orderBtn}
              onPress={() => {
                setIsRendering(true);
                setTimeout(() => {
                  setIsRendering(false);
                  alert('3D Figurine Order placed! Sent to Master AI 3D-mesh generation pipeline.');
                  onClose();
                }, 2000);
              }}
            >
              <Text style={styles.orderBtnText}>Order 3D Figure</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeBtn: {
    fontSize: 18,
    color: '#94a3b8',
    padding: 4,
  },
  previewBox: {
    height: 180,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  badge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ec4899',
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  styleLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  renderingText: {
    color: '#ec4899',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeTab: {
    borderColor: '#ec4899',
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
  },
  tabText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ec4899',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  orderBtn: {
    backgroundColor: '#ec4899',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  orderBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
