import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  Alert,
  Platform,
  TextInput,
  // Remove default Button
  TouchableOpacity, // Use TouchableOpacity for custom button styling
  ScrollView, // Allow form to scroll if needed
  KeyboardAvoidingView, // Help with keyboard overlap
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
// --- CORRECT IMPORT for Firestore functions ---
// db should come from your config, functions from the SDK
import { db } from '../firebase'; // Assuming db is exported from here
import { collection, addDoc } from 'firebase/firestore'; // Functions from SDK
// ---
import * as Location from 'expo-location';

// Adjust the import path based on where you moved types.ts
import { Coords, OverpassResponse, Court } from '../types'; // Assuming types.ts is one level up

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const SEARCH_RADIUS_METERS = 5000; // 5km

const DEFAULT_REGION: Region = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 50,
  longitudeDelta: 50,
};

// --- Simple Style Constants ---
const Colors = {
  primary: '#007AFF', // iOS Blue
  secondaryText: '#555',
  border: '#D1D1D6', // Lighter gray border
  lightGray: '#EFEFF4', // Very light gray for backgrounds
  white: '#FFFFFF',
  error: '#FF3B30', // iOS Red
  text: '#1C1C1E', // Dark text
  placeholder: '#8E8E93', // Gray placeholder
  orange: 'orange', // For markers
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
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [gameTime, setGameTime] = useState<string>('');
  // Use string for playersCount for easier TextInput handling (parsing happens on submit)
  const [playersCount, setPlayersCount] = useState<string>('');
  const [skillLevel, setSkillLevel] = useState<string>('');

  const mapRef = useRef<MapView>(null);

  // --- Effects (Keep existing logic) ---
  useEffect(() => { /* Location fetching logic */
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

  useEffect(() => { /* Court fetching logic */
    if (!userLocation) return;
    let isMounted = true; setLoadingCourts(true); setErrorMsg(null);
    const fetchCourts = async () => {
        const query = `[out:json][timeout:30];(nwr[sport=basketball](around:${SEARCH_RADIUS_METERS},${userLocation.latitude},${userLocation.longitude});nwr[leisure=pitch][sport=basketball](around:${SEARCH_RADIUS_METERS},${userLocation.latitude},${userLocation.longitude}););out center;`;
        const url = `${OVERPASS_API_URL}?data=${encodeURIComponent(query)}`;
        try {
            const res = await fetch(url); if (!res.ok) throw new Error(`Overpass Error: ${res.status}`);
            const data: OverpassResponse = await res.json();
            const found = data.elements.map((el): Court | null => {
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

  useEffect(() => { /* Map animation logic */
    if (isMapReady && userLocation && mapRef.current) {
        mapRef.current.animateToRegion({ latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }, 1000);
    }
  }, [isMapReady, userLocation]);


  // --- Handlers ---
  const handleMapReady = useCallback(() => setIsMapReady(true), []);

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court);
    // Optional: Animate map to center selected court
    // if (mapRef.current) {
    //     mapRef.current.animateToCamera({ center: court, zoom: 15 }, { duration: 500 });
    // }
  };

  const handleCreateGame = async () => {
    const numPlayers = parseInt(playersCount, 10);

    // Simple Validation
    if (!selectedCourt) return Alert.alert('Missing Info', 'Please select a court on the map.');
    if (!gameTime.trim()) return Alert.alert('Missing Info', 'Please enter a game time.');
    if (isNaN(numPlayers) || numPlayers <= 0) return Alert.alert('Missing Info', 'Please enter a valid number of players.');
    if (!skillLevel.trim()) return Alert.alert('Missing Info', 'Please enter a skill level.');

    // Use plain JS objects for Firestore if not using GeoPoint/Timestamp
    const courtData = {
      osmId: selectedCourt.id, // Keep OSM ID for reference
      latitude: selectedCourt.latitude,
      longitude: selectedCourt.longitude,
      name: selectedCourt.name || 'Unnamed Court',
    };

    const gameData = {
      court: courtData,
      time: gameTime.trim(),
      maxPlayers: numPlayers, // Store the parsed number
      skillLevel: skillLevel.trim(),
      createdAt: new Date().toISOString(), // Store as ISO string for simplicity
      // Add creator/player info here based on auth state
    };

    try {
      // setLoading(true); // Optional: Add saving state
      const gamesRef = collection(db, 'games'); // Ensure 'db' and 'collection' are correctly imported
      const docRef = await addDoc(gamesRef, gameData);

      console.log('Game Created with ID:', docRef.id);
      Alert.alert('Success', 'Game Created Successfully!');

      // Reset form
      setSelectedCourt(null);
      setGameTime('');
      setPlayersCount(''); // Reset string state
      setSkillLevel('');
    } catch (error) {
      console.error('Error creating game:', error);
      Alert.alert('Error', 'Failed to create game. Please try again.');
    } finally {
        // setLoading(false);
    }
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

  return (
    <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0} // Adjust as needed
    >
      {/* Map Area */}
      <View style={styles.mapContainer}>
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
          {courts.map((court) => (
            <Marker
              key={court.id.toString()}
              coordinate={{ latitude: court.latitude, longitude: court.longitude }}
              title={court.name || 'Basketball Court'}
              // description={`OSM ID: ${court.id}`} // Keep it simple
              pinColor={selectedCourt?.id === court.id ? Colors.primary : Colors.orange} // Highlight selected
              onPress={() => handleCourtSelect(court)}
            />
          ))}
        </MapView>
         {/* Loading Indicator for Courts */}
         {loadingCourts && (
            <View style={styles.loadingOverlayMap}>
                <ActivityIndicator size="small" color={Colors.secondaryText} />
            </View>
         )}
         {/* Error message overlay for court fetch errors */}
         {errorMsg && userLocation && (
            <View style={styles.errorOverlayMap}>
                <Text style={styles.errorOverlayText}>{errorMsg}</Text>
            </View>
         )}
      </View>

      {/* Form Area */}
      <ScrollView style={styles.formScrollView} contentContainerStyle={styles.formContentContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Selected Court</Text>
          <View style={styles.displayBox}>
            <Text style={selectedCourt ? styles.displayText : styles.placeholderText}>
              {selectedCourt ? (selectedCourt.name || `Court ID: ${selectedCourt.id}`) : 'Tap a court on the map'}
            </Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Game Time</Text>
          <TextInput
            style={styles.input}
            value={gameTime}
            onChangeText={setGameTime}
            placeholder="e.g., Tonight 7 PM"
            placeholderTextColor={Colors.placeholder}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Max Players</Text>
          <TextInput
            style={styles.input}
            value={playersCount} // Use string state directly
            onChangeText={(text) => setPlayersCount(text.replace(/[^0-9]/g, ''))} // Allow only digits
            placeholder="e.g., 10"
            placeholderTextColor={Colors.placeholder}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Skill Level</Text>
          <TextInput
            style={styles.input}
            value={skillLevel}
            onChangeText={setSkillLevel}
            placeholder="e.g., Casual, Intermediate"
            placeholderTextColor={Colors.placeholder}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, !selectedCourt && styles.buttonDisabled]} // Apply disabled style
          onPress={handleCreateGame}
          disabled={!selectedCourt} // Actual disable
        >
          <Text style={styles.buttonText}>Create Game</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray, // Use a light background overall
  },
  mapContainer: {
    flex: 3, // Map takes more space
    position: 'relative', // Needed for overlay positioning
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  map: {
    ...StyleSheet.absoluteFillObject, // Map fills its container
  },
  formScrollView: {
    flex: 2, // Form takes less space
    backgroundColor: Colors.white, // White background for form area
  },
  formContentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg, // Extra space at bottom
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    color: Colors.secondaryText,
    marginBottom: Spacing.sm,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.white,
    height: 44, // Standard input height
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  displayBox: { // For showing selected court
    backgroundColor: Colors.lightGray,
    height: 44,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center', // Center text vertically
  },
  displayText: {
    fontSize: 16,
    color: Colors.text,
  },
  placeholderText: {
      fontSize: 16,
      color: Colors.placeholder,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.sm, // Add margin above button
  },
  buttonDisabled: {
    backgroundColor: '#A9A9A9', // Darker gray when disabled
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600', // Slightly less bold
  },
  // Centered container for initial loading/error
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.lightGray,
  },
  infoText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
  errorTextHeadline: {
    fontSize: 20, // Slightly smaller headline
    fontWeight: '600',
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    lineHeight: 22, // Improve readability
  },
  // Overlays for map area
  loadingOverlayMap: {
    position: 'absolute',
    top: Spacing.md,
    alignSelf: 'center', // Center horizontally
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: Spacing.sm,
    borderRadius: 20,
    maxHeight: 40,
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
  // Deprecated style, combined into overlays above
  // infoTextSmall: { ... }
  // loadingOverlay: { ... }
});

export default MapViewScreen;