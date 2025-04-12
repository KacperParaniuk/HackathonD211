import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  Alert,
  Platform,
  TextInput,
  Button,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { db, collection, addDoc } from '../firebase';
import * as Location from 'expo-location';

// Adjust the import path based on where you moved types.ts
import { Coords, OverpassResponse, Court } from '../types';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const SEARCH_RADIUS_METERS = 5000; // 5km

const DEFAULT_REGION: Region = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 50,
  longitudeDelta: 50,
};

const MapViewScreen: React.FC = () => {
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true);
  const [loadingCourts, setLoadingCourts] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [gameTime, setGameTime] = useState<string>('');
  const [playersCount, setPlayersCount] = useState<number>(0);
  const [skillLevel, setSkillLevel] = useState<string>('');

  const mapRef = useRef<MapView>(null);

  // Effect 1: Get Location Permissions and User's Coordinates
  useEffect(() => {
    let isMounted = true;
    setLoadingLocation(true);
    setErrorMsg(null);

    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (isMounted) {
          setErrorMsg('Location permission denied. Please enable it in settings to find nearby courts.');
          Alert.alert("Permission Denied", "Enable location services in settings to find nearby courts.");
          setLoadingLocation(false);
        }
        return;
      }

      try {
        let location = await Location.getLastKnownPositionAsync({});
        if (!location && isMounted) {
          location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        }

        if (location && isMounted) {
          setUserLocation(location.coords);
          setErrorMsg(null);
        } else if (isMounted) {
          setErrorMsg('Could not determine location.');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMsg(`Error fetching location: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } finally {
        if (isMounted) {
          setLoadingLocation(false);
        }
      }
    };

    getLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  // Effect 2: Fetch Courts Data via Overpass API
  useEffect(() => {
    if (!userLocation) return;

    let isMounted = true;
    setLoadingCourts(true);
    setErrorMsg(null);

    const fetchCourts = async () => {
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

      try {
        const response = await fetch(url);
        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Could not read error body');
          throw new Error(`Overpass API Error: ${response.status} ${response.statusText}`);
        }

        const data: OverpassResponse = await response.json();

        const foundCourts: Court[] = data.elements
          .map((element): Court | null => {
            let lat: number | undefined;
            let lon: number | undefined;

            if (element.type === 'node' && typeof element.lat === 'number' && typeof element.lon === 'number') {
              lat = element.lat;
              lon = element.lon;
            } else if (element.center && typeof element.center.lat === 'number' && typeof element.center.lon === 'number') {
              lat = element.center.lat;
              lon = element.center.lon;
            }

            if (lat !== undefined && lon !== undefined) {
              return { id: element.id, latitude: lat, longitude: lon, name: element.tags?.name };
            }

            return null;
          })
          .filter((court): court is Court => court !== null);

        if (isMounted) {
          setCourts(foundCourts);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMsg(`Failed to get court data: ${error instanceof Error ? error.message : 'Network error'}`);
          setCourts([]);
        }
      } finally {
        if (isMounted) {
          setLoadingCourts(false);
        }
      }
    };

    fetchCourts();

    return () => {
      isMounted = false;
    };
  }, [userLocation]);

  // Effect 3: Animate Map to User Location
  useEffect(() => {
    if (isMapReady && userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 1000);
    }
  }, [isMapReady, userLocation]);

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
  }, []);

  // Handle court selection
  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court);
  };

  const handleCreateGame = async () => {
    if (selectedCourt && gameTime && playersCount && skillLevel) {
      // Clean court data to avoid undefined fields
      const courtData = {
        id: selectedCourt.id,
        latitude: selectedCourt.latitude,
        longitude: selectedCourt.longitude,
        name: selectedCourt.name ?? '', // fallback to empty string if name is undefined
      };
  
      const gameData = {
        court: courtData,
        time: gameTime,
        playersCount,
        skillLevel,
        createdAt: new Date(),
      };
  
      try {
        const gamesRef = collection(db, 'games');
        const docRef = await addDoc(gamesRef, gameData);
  
        console.log('Game Created with ID:', docRef.id);
        alert('Game Created Successfully!');
  
        // Reset form fields
        setSelectedCourt(null);
        setGameTime('');
        setPlayersCount(0);
        setSkillLevel('');
      } catch (error) {
        console.error('Error creating game:', error);
        alert('Failed to create game. Please try again.');
      }
    } else {
      alert('Please fill in all fields');
    }
  };
  
  

  if (loadingLocation) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.infoText}>Getting your location...</Text>
      </View>
    );
  }

  if (errorMsg && !userLocation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTextHeadline}>Error</Text>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: userLocation ? userLocation.latitude : DEFAULT_REGION.latitude,
          longitude: userLocation ? userLocation.longitude : DEFAULT_REGION.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onMapReady={handleMapReady}
      >
        {courts.map((court) => (
          <Marker
            key={court.id.toString()}
            coordinate={{ latitude: court.latitude, longitude: court.longitude }}
            title={court.name || 'Basketball Court'}
            description={`OSM ID: ${court.id}`}
            pinColor="orange"
            onPress={() => handleCourtSelect(court)}
          />
        ))}
      </MapView>

      <View style={styles.formContainer}>
        <Text>Select Court:</Text>
        {selectedCourt ? (
          <Text>Court Selected</Text>
        ) : (
          <Text>No court selected</Text>
        )}

        <Text>Game Time:</Text>
        <TextInput
          style={styles.input}
          value={gameTime}
          onChangeText={setGameTime}
          placeholder="Enter game time"
        />

        <Text>Number of Players:</Text>
        <TextInput
          style={styles.input}
          value={playersCount.toString()}
          onChangeText={(text) => setPlayersCount(parseInt(text) || 0)}
          placeholder="Enter number of players"
          keyboardType="numeric"

        />

        <Text>Skill Level:</Text>
        <TextInput
          style={styles.input}
          value={skillLevel}
          onChangeText={setSkillLevel}
          placeholder="Enter skill level"
        />

        <Button title="Create Game" onPress={handleCreateGame} />
      </View>

      {loadingCourts && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#333" />
          <Text style={styles.infoTextSmall}>Loading courts...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoText: {
    marginTop: 15,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  infoTextSmall: {
    marginTop: 5,
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  errorTextHeadline: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 10,
  },
  formContainer: {
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

export default MapViewScreen;
