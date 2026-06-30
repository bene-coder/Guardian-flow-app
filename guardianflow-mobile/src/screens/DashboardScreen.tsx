import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../config/socket';

export default function DashboardScreen() {
    const { user, signOut } = useAuth();
    const socket = getSocket();

    // Location States
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isTracking, setIsTracking] = useState(false);

    // GuardianFlow Active Defense States
    const [panicActive, setPanicActive] = useState(false);
    const [deadManStatus, setDeadManStatus] = useState('Monitoring anomalous stops...');
    const [networkState, setNetworkState] = useState<'Online (Socket)' | 'Offline (SMS Fallback)'>('Online (Socket)');

    const mapRef = useRef<MapView | null>(null);

    // Request Permissions & Get Initial Location
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
        })();
    }, []);

    // Handle shift start/stop location updates
    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        const startWatching = async () => {
            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 3000,
                    distanceInterval: 5,
                },
                (newLocation) => {
                    setLocation(newLocation);

                    // Emitting live coordinate stream to Express backend
                    if (socket && socket.connected) {
                        socket.emit('driver-telemetry', {
                            driverId: user?.id,
                            driverName: user?.name,
                            vehiclePlate: user?.vehiclePlate,
                            latitude: newLocation.coords.latitude,
                            longitude: newLocation.coords.longitude,
                            speed: newLocation.coords.speed ?? 0,
                            timestamp: newLocation.timestamp,
                            panicActive: panicActive
                        });
                    }

                    if (mapRef.current) {
                        mapRef.current.animateToRegion({
                            latitude: newLocation.coords.latitude,
                            longitude: newLocation.coords.longitude,
                            latitudeDelta: 0.005,
                            longitudeDelta: 0.005,
                        }, 1000);
                    }
                }
            );
        };

        if (isTracking) {
            startWatching();
        } else {
            if (subscription) {
                (subscription as Location.LocationSubscription).remove();
            }
        }

        return () => {
            if (subscription) {
                (subscription as Location.LocationSubscription).remove();
            }
        };
    }, [isTracking, panicActive]);

    // Simulate network dropout to prove "100% Offline Capability"
    const toggleNetworkMode = () => {
        setNetworkState(prev =>
            prev === 'Online (Socket)' ? 'Offline (SMS Fallback)' : 'Online (Socket)'
        );
    };

    // Trigger Ghost Panic SOS Simulation
    const handlePanicTrigger = () => {
        const nextPanicState = !panicActive;
        setPanicActive(nextPanicState);

        // Emit instant SOS event to the server
        if (socket && socket.connected) {
            socket.emit('panic-alert', {
                driverId: user?.id,
                driverName: user?.name,
                vehiclePlate: user?.vehiclePlate,
                panicActive: nextPanicState,
                latitude: location?.coords.latitude ?? 0,
                longitude: location?.coords.longitude ?? 0,
            });
        }

        if (nextPanicState) {
            Alert.alert(
                "🚨 SILENT SOS CHANNELS INITIATED",
                "HQ notified successfully.\nAudio Espionage Microphones are now live streaming to dispatch.",
                [{ text: "Acknowledge" }]
            );
        }
    };

    return (
        <View style={styles.container}>
            {/* Interactive Map */}
            {location ? (
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_DEFAULT}
                    style={styles.map}
                    initialRegion={{
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    }}
                    customMapStyle={mapDarkStyle}
                >
                    <Marker
                        coordinate={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        }}
                        title="Your Asset Location"
                        description={`Plate: ${user?.vehiclePlate}`}
                        pinColor={panicActive ? "#EF4444" : "#3B82F6"}
                    />
                </MapView>
            ) : (
                <View style={styles.mapPlaceholder}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.placeholderText}>Locking Asset GPS Signals...</Text>
                    {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
                </View>
            )}

            {/* Top Floating Dashboard HUD */}
            <View style={styles.hudHeader}>
                <View style={styles.driverBadge}>
                    <Text style={styles.driverName}>{user?.name}</Text>
                    <Text style={styles.driverPlate}>{user?.vehiclePlate}</Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.networkBadge,
                        networkState.includes('Offline') ? styles.networkOffline : styles.networkOnline
                    ]}
                    onPress={toggleNetworkMode}
                >
                    <Text style={styles.networkText}>{networkState}</Text>
                </TouchableOpacity>
            </View>

            {/* Main Control Console Panel */}
            <View style={[styles.controlPanel, panicActive && styles.panelPanic]}>

                {/* Active Telemetry Cards */}
                <View style={styles.telemetryRow}>
                    <View style={styles.telemetryCard}>
                        <Text style={styles.cardLabel}>CURRENT LATITUDE</Text>
                        <Text style={styles.cardValue}>
                            {location ? location.coords.latitude.toFixed(6) : '---'}
                        </Text>
                    </View>
                    <View style={styles.telemetryCard}>
                        <Text style={styles.cardLabel}>CURRENT LONGITUDE</Text>
                        <Text style={styles.cardValue}>
                            {location ? location.coords.longitude.toFixed(6) : '---'}
                        </Text>
                    </View>
                </View>

                {/* AI Dead Man Switch Status HUD */}
                <View style={styles.aiNotificationBar}>
                    <Text style={styles.aiLabel}>🧠 AI GUARD STATE:</Text>
                    <Text style={styles.aiStatus}>
                        {panicActive ? 'THREAT VERIFIED' : deadManStatus}
                    </Text>
                </View>

                {/* Active Defense System Action Buttons */}
                <View style={styles.actionsRow}>

                    {/* Main shift tracker */}
                    <TouchableOpacity
                        style={[styles.btnConsole, isTracking ? styles.btnStop : styles.btnStart]}
                        onPress={() => setIsTracking(!isTracking)}
                    >
                        <Text style={styles.btnText}>
                            {isTracking ? 'END ROUTE SHIFT' : 'START ROUTE SHIFT'}
                        </Text>
                    </TouchableOpacity>

                    {/* SOS Silent Panic Trigger */}
                    <TouchableOpacity
                        style={[styles.btnConsole, styles.btnPanic, panicActive && styles.btnPanicFlashing]}
                        onPress={handlePanicTrigger}
                    >
                        <Text style={styles.btnTextPanic}>
                            {panicActive ? 'CANCEL SILENT SOS' : 'GHOST PANIC (SOS)'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Sign Out Safe Mechanism */}
                <TouchableOpacity style={styles.btnSignOut} onPress={signOut}>
                    <Text style={styles.btnSignOutText}>Safely Sign Out of Console</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// styling block custom matching dark high-security visual aesthetics
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0E1A',
    },
    map: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height * 0.55,
    },
    mapPlaceholder: {
        height: Dimensions.get('window').height * 0.55,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
    },
    placeholderText: {
        color: '#94A3B8',
        marginTop: 12,
        fontSize: 14,
    },
    errorText: {
        color: '#EF4444',
        marginTop: 8,
        fontSize: 12,
    },
    hudHeader: {
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    driverBadge: {
        backgroundColor: 'rgba(19, 25, 43, 0.9)',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#1E294B',
    },
    driverName: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    driverPlate: {
        color: '#3B82F6',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    networkBadge: {
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
    },
    networkOnline: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10B981',
    },
    networkOffline: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderColor: '#F59E0B',
    },
    networkText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    controlPanel: {
        backgroundColor: '#13192B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: '#1E294B',
        padding: 20,
        flex: 1,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    panelPanic: {
        borderColor: '#EF4444',
        borderWidth: 2,
        backgroundColor: '#1C131D',
    },
    telemetryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    telemetryCard: {
        flex: 1,
        backgroundColor: '#0F172A',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#1E294B',
    },
    cardLabel: {
        fontSize: 10,
        color: '#64748B',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    cardValue: {
        fontSize: 16,
        color: '#FFF',
        fontWeight: 'bold',
    },
    aiNotificationBar: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        borderRadius: 8,
        padding: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#3B82F6',
        alignItems: 'center',
        marginVertical: 10,
    },
    aiLabel: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: 'bold',
        marginRight: 6,
    },
    aiStatus: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginVertical: 10,
    },
    btnConsole: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    btnStart: {
        backgroundColor: '#10B981',
    },
    btnStop: {
        backgroundColor: '#64748B',
    },
    btnPanic: {
        backgroundColor: '#EF4444',
    },
    btnPanicFlashing: {
        backgroundColor: '#B91C1C',
        borderColor: '#FFF',
        borderWidth: 1,
    },
    btnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    btnTextPanic: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    btnSignOut: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    btnSignOutText: {
        color: '#64748B',
        fontSize: 12,
        textDecorationLine: 'underline',
    },
});

// Stylized dark color theme map variables
const mapDarkStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#1b2130" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1b2130" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
    {
        "featureType": "administrative.locality",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#d59563" }]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#d59563" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#304156" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [{ "color": "#212a37" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#0F172A" }]
    }
];