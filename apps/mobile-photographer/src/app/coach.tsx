import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';

export default function CoachScreen() {
    const [grading, setGrading] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Here we'd connect to the Master PC WebSocket to receive realtime AI coaching tips
        // e.g. discoveryService.getMasterIp().then(ip => connectWebSocket(ip))
        setIsConnected(true);
        
        // Using a mock interval to simulate real-time AI feedback from a tethered DSLR
        const timer = setInterval(() => {
            setGrading(Math.random() > 0.5 ? 'A+' : 'Needs Improvement');
        }, 8000);

        return () => clearInterval(timer);
    }, []);

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Live AI Coach</Text>
            
            <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: isConnected ? '#10b981' : '#ef4444' }]} />
                <Text style={styles.statusText}>{isConnected ? 'Connected to Master PC' : 'Searching for Master PC...'}</Text>
            </View>

            <View style={styles.card}>
                {!grading ? (
                    <View style={styles.waiting}>
                        <ActivityIndicator color="#10b981" />
                        <Text style={styles.tip}>Waiting for your next shot...</Text>
                    </View>
                ) : (
                    <>
                        <Text style={[styles.badge, { color: grading === 'A+' ? '#10b981' : '#f59e0b' }]}>
                            {grading}
                        </Text>
                        <Text style={styles.tip}>
                            {grading === 'A+' 
                                ? 'Perfect exposure and sharp focus. Keep it up!'
                                : 'Subject is slightly underexposed. Try increasing ISO by 1 stop.'}
                        </Text>
                    </>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', padding: 20 },
    title: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 10, marginTop: 40 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { color: '#a1a1aa', fontSize: 14 },
    card: { backgroundColor: '#18181b', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#27272a' },
    badge: { fontSize: 48, fontWeight: '900', marginBottom: 10 },
    tip: { color: '#e4e4e7', fontSize: 18, lineHeight: 26 },
    waiting: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }
});
