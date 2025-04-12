// src/screens/MapViewScreen.tsx (or wherever you place it, e.g., app/(tabs)/explore.tsx)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet,
    View,
    ActivityIndicator,
    Text,
    Alert,
    Platform, // Import Platform
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';

// Adjust the import path based on where you moved types.ts
// e.g., import { Coords, ... } from '../../types'; if types.ts is in the root
import { Coords, OverpassResponse, OverpassElement, Court } from '../types';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
// Consider reducing radius initially for faster testing if needed
const SEARCH_RADIUS_METERS = 5000; // 5km

// Default region (e.g., center of US) if location fails entirely
const DEFAULT_REGION: Region = {
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 50, // Zoomed out
    longitudeDelta: 50,
};

const MapViewScreen: React.FC = () => {
    const [userLocation, setUserLocation] = useState<Coords | null>(null);
    const [courts, setCourts] = useState<Court[]>([]);
    const [loadingLocation, setLoadingLocation] = useState<boolean>(true);
    const [loadingCourts, setLoadingCourts] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isMapReady, setIsMapReady] = useState<boolean>(false); // Track map readiness
    const [initialRegionSetByAnimation, setInitialRegionSetByAnimation] = useState<boolean>(false); // Track if animation occurred
    const mapRef = useRef<MapView>(null);

    // --- Effect 1: Get Location Permissions and User's Coordinates ---
    useEffect(() => {
        let isMounted = true; // Prevent state updates on unmounted component
        setLoadingLocation(true);
        setErrorMsg(null);

        const getLocation = async () => {
            console.log("Requesting location permissions...");
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (isMounted) {
                    setErrorMsg('Location permission denied. Please enable it in settings to find nearby courts.');
                    Alert.alert("Permission Denied", "Enable location services in settings to find nearby courts.");
                    setLoadingLocation(false);
                }
                return;
            }
            console.log("Location permission granted.");

            try {
                console.log("Getting last known position...");
                let location = await Location.getLastKnownPositionAsync({});

                if (!location && isMounted) {
                    console.log("No last known location, fetching current position (High Accuracy)...");
                    // Use a timeout to prevent hanging indefinitely
                    location = await Location.getCurrentPositionAsync({
                         accuracy: Location.Accuracy.High,
                         // 10 seconds timeout
                        });
                } else if (isMounted) {
                     console.log("Using last known position.");
                }


                if (location && isMounted) {
                    console.log("User Location Found:", location.coords);
                    setUserLocation(location.coords);
                    setErrorMsg(null); // Clear previous errors if location is now successful
                } else if (isMounted) {
                     console.warn("Could not determine location even after requesting current.");
                    setErrorMsg('Could not determine location.');
                }
            } catch (error: any) {
                console.error("Location Fetch Error:", error);
                if (isMounted) {
                    setErrorMsg(`Error fetching location: ${error.message || 'Unknown error'}`);
                    // Don't show alert here, rely on the error message display
                }
            } finally {
                if (isMounted) {
                    setLoadingLocation(false);
                }
            }
        };

        getLocation();

        return () => {
            isMounted = false; // Cleanup function on unmount
        };
    }, []); // Run only once on mount

    // --- Effect 2: Fetch Courts Data via Overpass API ---
    useEffect(() => {
        // Only fetch courts if we have a user location
        if (!userLocation) {
            // If loading location finished but resulted in no location, stop court loading too
             if (!loadingLocation) {
                setLoadingCourts(false);
             }
            return;
        }

        let isMounted = true;
        setLoadingCourts(true);
        setErrorMsg(null); // Clear previous errors when starting court fetch

        const fetchCourts = async () => {
            // Construct Overpass Query Language (QL) query
            const query = `
                [out:json][timeout:30];
                (
                  nwr[sport=basketball](around:${SEARCH_RADIUS_METERS},${userLocation.latitude},${userLocation.longitude});
                  nwr[leisure=pitch][sport=basketball](around:${SEARCH_RADIUS_METERS},${userLocation.latitude},${userLocation.longitude});
                );
                out center;
              `;
            const encodedQuery = encodeURIComponent(query);
            const url = `${OVERPASS_API_URL}?data=${encodedQuery}`;
            console.log("Querying Overpass API:", url);

            try {
                const response = await fetch(url);
                console.log(`Overpass Response Status: ${response.status}`);
                if (!response.ok) {
                    // Attempt to read error body from Overpass if available
                    const errorBody = await response.text().catch(() => 'Could not read error body');
                    console.error("Overpass API Error Body:", errorBody);
                    throw new Error(`Overpass API Error: ${response.status} ${response.statusText}`);
                }

                const data: OverpassResponse = await response.json();
                // console.log("Raw Overpass Data:", data); // Uncomment for deep debugging

                // --- CRUCIAL: Filter and map data safely ---
                const foundCourts: Court[] = data.elements
                    .map((element): Court | null => { // Map first
                        let lat: number | undefined;
                        let lon: number | undefined;

                        if (element.type === 'node' && typeof element.lat === 'number' && typeof element.lon === 'number') {
                            lat = element.lat;
                            lon = element.lon;
                        } else if (element.center && typeof element.center.lat === 'number' && typeof element.center.lon === 'number') {
                            lat = element.center.lat;
                            lon = element.center.lon;
                        }

                        // Ensure coordinates are valid numbers before creating the object
                        if (lat !== undefined && !isNaN(lat) && lon !== undefined && !isNaN(lon)) {
                            return {
                                id: element.id,
                                latitude: lat,
                                longitude: lon,
                                name: element.tags?.name,
                                tags: element.tags,
                            };
                        }
                        // Log elements that get filtered out due to missing/invalid coords
                        // console.log(`Filtered out element ID ${element.id} type ${element.type} due to missing/invalid coords.`);
                        return null;
                    })
                    .filter((court): court is Court => court !== null); // Then filter out the nulls

                if (isMounted) {
                    console.log(`Processed ${foundCourts.length} valid courts from ${data.elements.length} elements.`);
                    setCourts(foundCourts);
                }

            } catch (error: any) {
                console.error("Court Fetch/Processing Error:", error);
                if (isMounted) {
                    setErrorMsg(`Failed to get court data: ${error.message || 'Network error'}`);
                    setCourts([]); // Clear courts on error
                }
            } finally {
                if (isMounted) {
                    setLoadingCourts(false);
                }
            }
        };

        fetchCourts();

        return () => {
            isMounted = false; // Cleanup on unmount or if userLocation changes
        };
    }, [userLocation, loadingLocation]); // Rerun if userLocation changes OR location loading finishes

    // --- Effect 3: Animate Map to User Location ---
    useEffect(() => {
        // Animate only if: map is ready, we have a location, ref exists, and we haven't animated yet
        if (isMapReady && userLocation && mapRef.current && !initialRegionSetByAnimation) {
            console.log("Animating map to user location...");
            mapRef.current.animateToRegion(
                {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.0922, // Standard zoom level
                    longitudeDelta: 0.0421,
                },
                1000 // Animation duration
            );
            setInitialRegionSetByAnimation(true); // Mark animation as done
        }
    }, [isMapReady, userLocation, initialRegionSetByAnimation]); // Dependencies

    // --- Handler for Map Ready event ---
    const handleMapReady = useCallback(() => {
        console.log("MapView is now ready.");
        setIsMapReady(true);
    }, []);

    // --- Render Logic ---

    // Initial Loading State (while getting location)
    if (loadingLocation) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.infoText}>Getting your location...</Text>
            </View>
        );
    }

    // Error State (if location failed and couldn't proceed)
    if (errorMsg && !userLocation) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorTextHeadline}>Error</Text>
                <Text style={styles.errorText}>{errorMsg}</Text>
                {/* You could add a "Retry" button here */}
            </View>
        );
    }

    // Main Map View
    return (
        <View style={styles.container}>
            {/* Display non-blocking errors as an overlay */}
            {errorMsg && userLocation && ( // Show court fetch errors only if location succeeded
                 <Text style={styles.errorTextOverlay}>{errorMsg}</Text>
            )}

            <MapView
                ref={mapRef}
                style={styles.map}
                // provider={PROVIDER_GOOGLE} // Keep commented out for now to test default provider first
                initialRegion={userLocation ? { // Set initial region based on user location if available
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  } : DEFAULT_REGION // Fallback to default if location failed
                }
                showsUserLocation={true}
                showsMyLocationButton={true} // Note: May require specific configuration per platform
                onMapReady={handleMapReady} // Set map ready state
                // Optional: Re-fetch on region change (add complexity)
                // onRegionChangeComplete={handleRegionChange}
            >
                {/* --- Render Court Markers --- */}
                {/* Use the state `courts` which should only contain valid ones */}
                {courts.map((court) => (
                    <Marker
                        key={court.id.toString()} // Ensure key is a string and unique
                        coordinate={{ latitude: court.latitude, longitude: court.longitude }}
                        title={court.name || 'Basketball Court'}
                        description={`OSM ID: ${court.id}`} // Keep description simple initially
                        pinColor="orange" // Color for OSM courts
                        // Add onPress later to navigate to details or creation linked to this court
                        // onPress={() => console.log('Tapped Court:', court.id)}
                    />
                ))}

                 {/* Add markers for YOUR app's games later, maybe with a different color */}

            </MapView>

            {/* Loading Indicator Overlay (for fetching courts) */}
            {loadingCourts && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#333" />
                    <Text style={styles.infoTextSmall}> Loading courts...</Text>
                </View>
            )}
        </View>
    );
};

// --- Styles --- (Keep your existing styles or adapt these)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff', // Add a background color
    },
    map: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f0f0f0',
    },
    infoText: {
        marginTop: 15,
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
    },
    infoTextSmall: {
        marginLeft: 8, // Add spacing from indicator
        fontSize: 12,
        color: '#333',
        textAlign: 'center',
    },
     errorTextHeadline: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'red',
        textAlign: 'center',
        marginBottom: 10,
    },
    errorText: {
       // fontSize: 16, // Handled by headline now
        color: 'red',
        textAlign: 'center',
        paddingHorizontal: 15,
    },
    errorTextOverlay: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 15, // Adjust for status bar/notch
        left: 15,
        right: 15,
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
        color: 'white',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        textAlign: 'center',
        zIndex: 10, // Ensure it's above the map
        fontSize: 13,
    },
    loadingOverlay: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center', // Center horizontally
        alignItems: 'center',
        zIndex: 10, // Above map
        // Optional styling for the overlay container itself:
        // backgroundColor: 'rgba(255, 255, 255, 0.8)',
        // paddingVertical: 8,
        // paddingHorizontal: 15,
        // borderRadius: 20,
        // alignSelf: 'center', // Center the box itself
    },
});

// --- Default Export ---
// Make sure this line is present and correct for Expo Router
export default MapViewScreen;