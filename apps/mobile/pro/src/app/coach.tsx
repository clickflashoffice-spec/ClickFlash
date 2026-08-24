import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface LiveCoachMetric {
    compositionScore: number;
    horizonTiltDegrees: number;
    smileClarityPercent: number;
    lightingScore: number;
    overallGrade: 'A+' | 'A' | 'B' | 'C' | 'RETAKE';
    coachingTips: string[];
    lastShotTime: string;
}

export default function CoachScreen() {
    const [metric, setMetric] = useState<LiveCoachMetric>({
        compositionScore: 96,
        horizonTiltDegrees: 0.2,
        smileClarityPercent: 98,
        lightingScore: 94,
        overallGrade: 'A+',
        coachingTips: [
            'Exceptional golden hour backlight separation.',
            'Upper-third eye line alignment is spot on.',
            'Keep shutter speed at 1/1000s for beach wave freeze.'
        ],
        lastShotTime: '10s ago'
    });
    const [isConnected] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            const grades: Array<'A+' | 'A' | 'B'> = ['A+', 'A', 'B'];
            const randomGrade = grades[Math.floor(Math.random() * grades.length)];
            const tilt = +(Math.random() * 2.2).toFixed(1);
            
            setMetric({
                compositionScore: Math.floor(88 + Math.random() * 12),
                horizonTiltDegrees: tilt,
                smileClarityPercent: Math.floor(85 + Math.random() * 15),
                lightingScore: Math.floor(90 + Math.random() * 10),
                overallGrade: randomGrade,
                coachingTips: tilt > 1.5
                    ? [
                        `Horizon is tilted ${tilt}° clockwise — enable in-EVF electronic level.`,
                        'Great genuine emotional expression on subject.'
                    ]
                    : [
                        'Perfect horizontal balance and leading lines.',
                        'Prime candidate for 3D laser-etched crystal upsell.'
                    ],
                lastShotTime: 'Just now'
            });
        }, 9000);

        return () => clearInterval(interval);
    }, []);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Live AI Photographer Coach</Text>
            
            <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]} />
                <Text style={styles.statusText}>
                    {isConnected ? 'Edge VLM Ingest Stream Active' : 'Offline / Standalone Mode'}
                </Text>
            </View>

            {/* Main Score Hero Card */}
            <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                    <Text style={styles.heroLabel}>LATEST SHOT QUALITY</Text>
                    <Text style={styles.shotTime}>{metric.lastShotTime}</Text>
                </View>
                <View style={styles.gradeContainer}>
                    <Text style={[styles.gradeText, { color: metric.overallGrade === 'A+' ? '#10b981' : '#38bdf8' }]}>
                        {metric.overallGrade}
                    </Text>
                    <View style={styles.gradeMeta}>
                        <Text style={styles.gradeTitle}>
                            {metric.overallGrade === 'A+' ? 'Flawless Concession Grade' : 'High Commercial Potential'}
                        </Text>
                        <Text style={styles.gradeSubtitle}>Automatic Guest Gallery Ingest</Text>
                    </View>
                </View>

                {/* Score Meters Grid */}
                <View style={styles.grid}>
                    <View style={styles.meterBox}>
                        <Text style={styles.meterLabel}>Composition</Text>
                        <Text style={styles.meterValue}>{metric.compositionScore}%</Text>
                    </View>
                    <View style={styles.meterBox}>
                        <Text style={styles.meterLabel}>Smile / Emotion</Text>
                        <Text style={styles.meterValue}>{metric.smileClarityPercent}%</Text>
                    </View>
                    <View style={styles.meterBox}>
                        <Text style={styles.meterLabel}>Horizon Tilt</Text>
                        <Text style={[styles.meterValue, { color: metric.horizonTiltDegrees > 1.5 ? '#f59e0b' : '#10b981' }]}>
                            {metric.horizonTiltDegrees}°
                        </Text>
                    </View>
                    <View style={styles.meterBox}>
                        <Text style={styles.meterLabel}>Lighting</Text>
                        <Text style={styles.meterValue}>{metric.lightingScore}%</Text>
                    </View>
                </View>
            </View>

            {/* Actionable Coaching Tips */}
            <View style={styles.tipsCard}>
                <Text style={styles.tipsHeader}>💡 ACTIONABLE FIELD COACHING</Text>
                <View style={styles.tipsList}>
                    {metric.coachingTips.map((tip, idx) => (
                        <View key={idx} style={styles.tipItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.tipText}>{tip}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Quick Actions */}
            <TouchableOpacity style={styles.button} activeOpacity={0.8}>
                <Text style={styles.buttonText}>Review Ingest History (Last 50 Shots)</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090d16' },
    content: { padding: 20, paddingBottom: 40 },
    title: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 30, marginBottom: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
    heroCard: { backgroundColor: '#0f172a', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16 },
    heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    heroLabel: { color: '#64748b', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    shotTime: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
    gradeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    gradeText: { fontSize: 52, fontWeight: '900', marginRight: 16 },
    gradeMeta: { flex: 1 },
    gradeTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    gradeSubtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    meterBox: { flex: 1, minWidth: '45%', backgroundColor: '#020617', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
    meterLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' },
    meterValue: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginTop: 4 },
    tipsCard: { backgroundColor: '#0f172a', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b', marginBottom: 20 },
    tipsHeader: { color: '#fbbf24', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
    tipsList: { gap: 10 },
    tipItem: { flexDirection: 'row', alignItems: 'flex-start' },
    bullet: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold', marginRight: 8, marginTop: -2 },
    tipText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18, flex: 1 },
    button: { backgroundColor: '#1e293b', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    buttonText: { color: '#38bdf8', fontSize: 13, fontWeight: '700' }
});
