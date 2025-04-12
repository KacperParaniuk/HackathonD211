// app/(tabs)/explore.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  Alert,
  Platform,
  TouchableOpacity, // Used for the FAB button
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
// NOTE: Firestore imports are removed as game creation is moved
import * as Location from 'expo-location';
import { useRouter } from 'expo-router'; // <-- Import for navigation
import { Ionicons } from '@expo/vector-icons'; // <-- Import for the button icon (optional)

// Adjust the import path based on where you moved types.ts
import { Coords, OverpassResponse, Court } from '../types'; // Assuming types.ts is two levels up

// --- Constants ---
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const SEARCH_RADIUS_METERS = 5000; // 5km

const DEFAULT_REGION: Region = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 50,
  longitudeDelta: 50,
};

const Colors = { // Keeping simple style constants
  primary: '#007AFF',
  secondaryText: '#555',
  border: '#D1D1D6',
  lightGray: '#EFEFF4',
  white: '#FFFFFF',
  error: '#FF3B30',
  text: '#1C1C1E',
  orange: 'orange',
};

const Spacing = {
  sm: 8,
  md: 16,
  lg: 24,
};
// ---

const MapViewScreen: React.FC = () => {
  // --- State Variables ---
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true);
  const [loadingCourts, setLoadingCourts] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  // Removed form-related state: selectedCourt, gameTime, playersCount, skillLevel

  const mapRef = useRef<MapView>(null);
  const router = useRouter(); // <-- Initialize router for navigation

  // --- Effects ---

  // Effect 1: Get Location Permissions and User's Coordinates (Keep existing logic)
  useEffect(() => {
    let isMounted = true; setLoadingLocation(true); setErrorMsg(null);
    const getLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { if (isMounted) { setErrorMsg('Location permission denied.'); Alert.alert("Permission Denied", "Enable location services in settings."); setLoadingLocation(false); } return; }
        try {
            let loc = await Location.getLastKnownPositionAsync({}) ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            if (loc && isMounted) { setUserLocation(loc.coords); setErrorMsg(null); } else if (isMounted) { setErrorMsg('Could not determine location.'); }
        } catch (err) { if (isMounted) setErrorMsg(`Location Error: ${err instanceof Error ? err.message : 'Unknown'}`); }
        finally { if (isMounted) setLoadingLocation(false); }
    };
    getLocation();
    return () => { isMounted = false; };
  }, []);

  // Effect 2: Fetch Courts Data via Overpass API (Keep existing logic)
  useEffect(() => {
    if (!userLocation) return;
    let isMounted = true; setLoadingCourts(true); setErrorMsg(null);
    const fetchCourts = async () => {
        const query = `[out:json][timeout:30];(nwr[sport=basketball](around:${SEARCH_RADIUS_METERS},${userLocation.latitude},${userLocation.longitude});nwr[leisure=pitch][sport=basketball](around:${SEARCH_RADIUS_METERS},${userLocation.latitude},${userLocation.longitude}););out center;`;
        const url = `${OVERPASS_API_URL}?data=${encodeURIComponent(query)}`;
        try {
            const res = await fetch(url); if (!res.ok) throw new Error(`Overpass Error: ${res.status}`);
            const data: OverpassResponse = await res.json();
            const found = data.elements.map((el): Court | null => { // Explicitly type el if needed: (el: OverpassElement)
                let lat: number | undefined, lon: number | undefined;
                if (el.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') { lat = el.lat; lon = el.lon; }
                else if (el.center && typeof el.center.lat === 'number' && typeof el.center.lon === 'number') { lat = el.center.lat; lon = el.center.lon; }
                return (lat !== undefined && lon !== undefined) ? { id: el.id, latitude: lat, longitude: lon, name: el.tags?.name } : null;
            }).filter((c): c is Court => c !== null);
            if (isMounted) setCourts(found);
        } catch (err) { if (isMounted) { setErrorMsg(`Court Fetch Error: ${err instanceof Error ? err.message : 'Network'}`); setCourts([]); } }
        finally { if (isMounted) setLoadingCourts(false); }
    };
    fetchCourts();
    return () => { isMounted = false; };
  }, [userLocation]);

  // Effect 3: Animate Map to User Location (Keep existing logic)
  useEffect(() => {
    if (isMapReady && userLocation && mapRef.current) {
        mapRef.current.animateToRegion({ latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }, 1000);
    }
  }, [isMapReady, userLocation]);

  // --- Handlers ---
  const handleMapReady = useCallback(() => setIsMapReady(true), []);

  // Handler for tapping an existing OSM court marker (optional action)
  const handleOSMCourtTap = (court: Court) => {
      console.log("Tapped OSM Court:", court.id, court.name);
       // Optional: Animate camera to the tapped court
    //    if (mapRef.current) {
    //     mapRef.current.animateToCamera({ center: court, zoom: 16 }, { duration: 500 });
    //    }
      // We don't setSelectedCourt here anymore as the form is gone
  };

  // Handler for the "Add Court" button press
  const handleAddCourtPress = () => {
      router.push('/add-court'); // Navigate to the new screen
  };

  // --- Render Logic ---

  if (loadingLocation) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.infoText}>Getting your location...</Text>
      </View>
    );
  }

  // Only show blocking error if location failed completely
  if (errorMsg && !userLocation && !loadingLocation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTextHeadline}>Error</Text>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  // Main view containing map and FAB
  return (
    <View style={styles.container}>
      {/* Map takes full space */}
      <MapView
        ref={mapRef}
        style={styles.map}
        // provider={PROVIDER_GOOGLE} // Enable if configured
        initialRegion={userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        } : DEFAULT_REGION}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onMapReady={handleMapReady}
      >
        {/* Render OSM Court Markers */}
        {courts.map((court) => (
          <Marker
            key={`osm-${court.id.toString()}`}
            coordinate={{ latitude: court.latitude, longitude: court.longitude }}
            title={court.name || 'Basketball Court'}
            pinColor={Colors.orange} // Keep OSM courts distinct
            onPress={() => handleOSMCourtTap(court)}
          />
        ))}
        {/* You might add markers for actual games fetched from Firestore later */}
      </MapView>

      {/* Loading Indicator for Courts (Overlay on Map) */}
      {loadingCourts && (
         <View style={styles.loadingOverlayMap}>
             <ActivityIndicator size="small" color={Colors.secondaryText} />
         </View>
      )}

      {/* Error message overlay for court fetch errors (Overlay on Map) */}
      {errorMsg && userLocation && (
         <View style={styles.errorOverlayMap}>
             <Text style={styles.errorOverlayText}>{errorMsg}</Text>
         </View>
      )}

      {/* Add Court Floating Action Button */}
      <TouchableOpacity
          style={styles.fab}
          onPress={handleAddCourtPress} // Navigate on press
          activeOpacity={0.7}
      >
          <Ionicons name="add" size={28} color={Colors.white} />
          {/* If @expo/vector-icons not installed, use text: */}
          {/* <Text style={styles.fabText}>+</Text> */}
      </TouchableOpacity>

    </View> // End main container View
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // No background color needed here as MapView fills it
  },
  map: {
    ...StyleSheet.absoluteFillObject, // Map fills its container (which is now the main container)
  },
  // Centered container for initial loading/error
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.lightGray, // Background for loading/error state
  },
  infoText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
  errorTextHeadline: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Overlays for map area
  loadingOverlayMap: {
    position: 'absolute',
    top: Spacing.md,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: Spacing.sm,
    borderRadius: 20,
    zIndex: 10,
  },
   errorOverlayMap: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(255, 59, 48, 0.85)', // Error color with opacity
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    zIndex: 10,
  },
  errorOverlayText: {
      color: Colors.white,
      fontSize: 13,
      textAlign: 'center',
      fontWeight: '500',
  },
  // Floating Action Button Style
  fab: {
      position: 'absolute',
      bottom: Spacing.lg,
      right: Spacing.lg,
      backgroundColor: Colors.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 20, // Above map overlays
      // Shadows
      elevation: 6, // Android
      shadowColor: '#000', // iOS
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
  },
  // Optional text style if not using Icon
  // fabText: {
  //   fontSize: 28,
  //   color: Colors.white,
  //   lineHeight: 30,
  // },
});

export default MapViewScreen;