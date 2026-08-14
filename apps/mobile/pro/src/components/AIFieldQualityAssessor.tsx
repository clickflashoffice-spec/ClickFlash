import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export interface FieldQualityMetrics {
  sharpnessScore: number; // 0 - 100
  exposureStatus: 'optimal' | 'under' | 'over';
  eyesClosedDetected: boolean;
  facesDetected: number;
  overallRating: 'perfect' | 'acceptable' | 'retake_recommended';
}

interface AIFieldQualityAssessorProps {
  metrics: FieldQualityMetrics | null;
  onRetakePress?: () => void;
  onAcceptPress?: () => void;
}

export function AIFieldQualityAssessor({
  metrics,
  onRetakePress,
  onAcceptPress,
}: AIFieldQualityAssessorProps) {
  if (!metrics) return null;

  const isWarning = metrics.overallRating === 'retake_recommended';

  return (
    <View style={[styles.card, isWarning ? styles.cardWarning : styles.cardSuccess]}>
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <Text style={styles.icon}>{isWarning ? '⚠️' : '✨'}</Text>
          <Text style={[styles.ratingTitle, isWarning ? styles.titleWarning : styles.titleSuccess]}>
            {isWarning ? 'RE-TAKE RECOMMENDED' : 'AI QUALITY: PERFECT SHOT'}
          </Text>
        </View>
        <Text style={styles.sharpnessText}>{metrics.sharpnessScore}% Sharp</Text>
      </View>

      {/* Breakdown chips */}
      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>
            Exposure: {metrics.exposureStatus.toUpperCase()}
          </Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipLabel}>
            Faces: {metrics.facesDetected}
          </Text>
        </View>
        {metrics.eyesClosedDetected && (
          <View style={[styles.chip, styles.chipAlert]}>
            <Text style={styles.chipAlertText}>👀 Blink Detected</Text>
          </View>
        )}
      </View>

      {/* Retake Prompt */}
      {isWarning && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.retakeBtn} onPress={onRetakePress}>
            <Text style={styles.retakeBtnText}>📸 Re-Take Shot Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAcceptPress}>
            <Text style={styles.acceptBtnText}>Keep</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
  },
  cardSuccess: {
    backgroundColor: 'rgba(6, 78, 59, 0.4)',
    borderColor: '#059669',
  },
  cardWarning: {
    backgroundColor: 'rgba(127, 29, 29, 0.5)',
    borderColor: '#ef4444',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  ratingTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  titleSuccess: {
    color: '#34d399',
  },
  titleWarning: {
    color: '#f87171',
  },
  sharpnessText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e4e4e7',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipLabel: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  chipAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  chipAlertText: {
    fontSize: 11,
    color: '#fca5a5',
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  retakeBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  retakeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  acceptBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
