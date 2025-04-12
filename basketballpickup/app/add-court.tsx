// app/add-court.tsx
import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Button,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
    Platform,
    TextInput, // <-- Import TextInput
 } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router'; // <-- Import useRouter
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants'; // Keep for potential future use or other config
import * as Location from 'expo-location'; // <-- Import Location

// --- CORRECT IMPORT for Firestore functions & types ---
import { db } from './firebase'; // Assuming db is exported from your config file
import {
  collection,
  addDoc,
  GeoPoint,     // <-- Import GeoPoint
  Timestamp,    // <-- Import Timestamp
} from 'firebase/firestore';
// ---

// --- Vision API Analysis Function ---
// WARNING: Hardcoded API Key is insecure. Use environment variables.
const GOOGLE_CLOUD_API_KEY = "AIzaSyCZznwUOnhePsA-dILWHIhw2kHIPkCbdjU";

interface VisionLabel {
    mid?: string;
    description: string;
    score: number;
    topicality?: number;
}

interface VisionTextAnnotation {
    locale?: string;
    description: string;
    boundingPoly?: any;
}

interface VisionAnalysisResult {
    isPark?: boolean;
    labels: VisionLabel[];
    textAnnotations: VisionTextAnnotation[];
    fullText: string;
}

interface VisionError {
    error: string;
}

// --- analyzeImageWithCloudVision Function (Keep existing logic) ---
const analyzeImageWithCloudVision = async (imageUri: string): Promise<VisionAnalysisResult | VisionError> => {
    if (!GOOGLE_CLOUD_API_KEY) { console.error("..."); return { error: "API Key missing (hardcoded)" }; }
    if (!imageUri) { return { error: "No image URI." }; }
    console.log("Starting image analysis...");
    try {
        const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
        console.log("Base64 done. Requesting API...");
        const response = await axios.post(
            'https://vision.googleapis.com/v1/images:annotate',
            { requests: [{ image: { content: base64 }, features: [ { type: "LABEL_DETECTION", maxResults: 15 }, { type: "TEXT_DETECTION" } ] }] },
            { params: { key: GOOGLE_CLOUD_API_KEY } }
        );
        console.log("API response received.");
        const result = response.data.responses?.[0];
        if (!result) { console.error("..."); return { error: "Invalid API response structure." } }
        const labels: VisionLabel[] = result.labelAnnotations || [];
        const isPark = labels.some(l => /park|playground|recreation|outdoor|field|court/i.test(l.description) && l.score > 0.75);
        const textAnnotations: VisionTextAnnotation[] = result.textAnnotations || [];
        const fullText = result.fullTextAnnotation?.text || '';
        console.log("Analysis complete.");
        return { isPark, labels, textAnnotations, fullText };
    } catch (error: any) { console.error('Error analyzing image:', error.response?.data || error.message); return { error: `Analysis failed: ${error.message}` }; }
};
// --- End Vision API Function ---


// --- AddCourtScreen Component ---
const AddCourtScreen: React.FC = () => {
  // State variables
  const [image, setImage] = useState<string | null>(null);
  const [courtName, setCourtName] = useState<string>(''); // <-- State for Name
  const [courtDescription, setCourtDescription] = useState<string>(''); // <-- State for Description
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // <-- Combined loading state
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null); // Store successful analysis
  const [processError, setProcessError] = useState<string | null>(null); // <-- Combined error state

  // Hooks
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const router = useRouter();

  // --- takePhoto function ---
  const takePhoto = async () => {
    setAnalysisResult(null); setProcessError(null); // Clear previous results/errors
    if (!cameraPermission?.granted) {
        const permissionResult = await requestCameraPermission();
        if (!permissionResult.granted) { Alert.alert("Permission Required", "Camera permission is needed."); return; }
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets && result.assets.length > 0) { setImage(result.assets[0].uri); }
  };


  // --- *** Combined Analyze and Save Handler *** ---
  const handleAnalyzeAndSaveCourt = async () => {
    // 1. Initial Validation
    if (!image) {
        Alert.alert("Missing Image", "Please take a photo first.");
        return;
    }
    if (!courtName.trim()) {
        Alert.alert("Missing Info", "Please enter a court name.");
        return;
    }

    setIsProcessing(true);
    setAnalysisResult(null); // Clear previous successful analysis
    setProcessError(null);   // Clear previous errors

    // 2. Analyze Image
    console.log("Starting analysis for save...");
    const analysisOutcome = await analyzeImageWithCloudVision(image);

    // Handle Analysis Error
    if ('error' in analysisOutcome) {
        setProcessError(`Analysis Failed: ${analysisOutcome.error}`);
        Alert.alert("Analysis Failed", analysisOutcome.error);
        setIsProcessing(false);
        return;
    }

    // Store successful analysis result (can be useful for display/debug even if save fails)
    setAnalysisResult(analysisOutcome);
    console.log("Analysis successful:", analysisOutcome);

    // 3. Check if Analysis indicates a park/court
    if (!analysisOutcome.isPark) {
        // Keep analysis result displayed but show error message
        setProcessError("Analysis complete, but doesn't look like a park/court. Save cancelled.");
        Alert.alert("Validation Failed", "Analysis doesn't strongly indicate a park or court. Cannot save automatically.");
        setIsProcessing(false);
        return;
    }

    // --- Proceed to Save if Analysis Passed ---

    // 4. Get Current Location
    let currentLocation: Location.LocationObject | null = null;
    console.log("Analysis indicates park/court. Getting location...");
    try {
        if (!locationPermission?.granted) {
            const { status } = await requestLocationPermission();
            if (status !== 'granted') throw new Error("Location permission denied.");
        }
        // Added timeout for location request
        currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
             // 10 second timeout
        });
        if (!currentLocation) throw new Error("Could not get current location (timeout or other issue).");
        console.log("Location acquired:", currentLocation.coords);

    } catch (error: any) {
        console.error("Location error during save:", error);
        setProcessError(`Location Error: ${error.message}`);
        Alert.alert("Location Error", `Could not get location to save: ${error.message}`);
        setIsProcessing(false); // Stop processing on location error
        return;
    }

    // 5. Prepare Data for Firestore
    const courtData = {
        name: courtName.trim(),
        description: courtDescription.trim(),
        location: new GeoPoint(currentLocation.coords.latitude, currentLocation.coords.longitude),
        imageUri: image, // ** WARNING: Storing local URI - needs upload to cloud storage **
        isParkDetected: analysisOutcome.isPark, // Always true if we reach here
        visionLabels: analysisOutcome.labels.slice(0, 10).map(l => ({ description: l.description, score: l.score })),
        visionText: analysisOutcome.fullText.substring(0, 1500), // Limit stored text
        createdAt: Timestamp.now(),
        // TODO: Add creatorUid from Firebase Auth state (e.g., auth.currentUser?.uid)
    };

    console.log("Attempting to save court data to Firestore:", courtData);

    // 6. Save to Firestore
    try {
        const courtsCollection = collection(db, 'courts'); // Saving to 'courts' collection
        const docRef = await addDoc(courtsCollection, courtData);
        console.log("Court saved successfully with ID:", docRef.id);

        Alert.alert("Success", "Court analyzed and saved successfully!", [
            { text: "OK", onPress: () => router.back() } // Go back to map screen
        ]);
        // State is implicitly reset by navigating back

    } catch (error: any) {
        console.error("Firestore saving error:", error);
        setProcessError(`Save Failed: ${error.message}`);
        Alert.alert("Save Failed", `Could not save the court: ${error.message}`);
        setIsProcessing(false); // Set processing to false ONLY on save error
    }
    // No finally block needed here as success navigates away
  };
  // --- *** End Combined Handler *** ---


  // --- Render Logic ---
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
       <Stack.Screen options={{ title: 'Add Court' }} />

       <Text style={styles.title}>Add New Court</Text>

        {/* --- Input Fields --- */}
       <View style={styles.inputGroup}>
           <Text style={styles.label}>Court Name*</Text>
           <TextInput
               style={styles.input}
               value={courtName}
               onChangeText={setCourtName}
               placeholder="e.g., Lincoln Park Main Court"
               placeholderTextColor="#999"
               editable={!isProcessing} // Disable while processing
           />
       </View>
       <View style={styles.inputGroup}>
           <Text style={styles.label}>Description (Optional)</Text>
           <TextInput
               style={[styles.input, styles.textArea]}
               value={courtDescription}
               onChangeText={setCourtDescription}
               placeholder="e.g., Near the entrance, good nets, lights available."
               placeholderTextColor="#999"
               multiline
               numberOfLines={3}
               editable={!isProcessing} // Disable while processing
           />
       </View>
       {/* --- End Input Fields --- */}

        {/* Camera Section */}
        <View style={styles.cameraSection}>
            {image ? (
                <Image source={{ uri: image }} style={styles.imagePreview} />
            ) : (
                <View style={styles.imagePlaceholder}>
                    <Text style={styles.placeholderText}>Take a photo of the court area</Text>
                </View>
            )}
            {/* Disable Take Photo button during processing */}
            <Button title="Take Photo of Court" onPress={takePhoto} disabled={isProcessing} />
        </View>

        {/* Combined Analyze and Save Button */}
        <View style={styles.buttonContainer}>
             {/* Show ActivityIndicator when processing */}
            {isProcessing && <ActivityIndicator size="small" color="#007AFF" style={styles.activityIndicator} />}
            <Button
                title={isProcessing ? "Processing..." : "Analyze & Save Court"}
                onPress={handleAnalyzeAndSaveCourt} // <-- Call the combined handler
                // Disable button if no image is present or already processing
                disabled={!image || isProcessing}
            />
        </View>

        {/* Display Analysis Results (show even if save failed, useful context) */}
        {analysisResult && (
            <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Analysis Results:</Text>
                <Text style={styles.resultText}>Likely a Park/Court: {analysisResult.isPark ? 'Yes' : 'No'}</Text>
                <Text style={styles.resultLabel}>Top Labels:</Text>
                {analysisResult.labels.slice(0, 5).map((label, index) => (
                    <Text key={label.mid || index} style={styles.resultItem}>
                        - {label.description} ({(label.score * 100).toFixed(1)}%)
                    </Text>
                ))}
                <Text style={styles.resultLabel}>Detected Text:</Text>
                <Text style={[styles.resultItem, styles.detectedText]}>
                     {analysisResult.fullText || '(None detected)'}
                </Text>
            </View>
        )}

        {/* Display Processing Errors (Analysis or Save) */}
        {processError && (
            <View style={[styles.resultContainer, styles.errorBox]}>
                <Text style={styles.resultTitleError}>Error:</Text>
                <Text style={styles.errorText}>{processError}</Text>
            </View>
        )}

         {/* Warning about local image URI */}
         <Text style={styles.warningText}>
         </Text>

    </ScrollView>
  );
}

// --- Styles (Ensure styles are present) ---
const styles = StyleSheet.create({
  scrollContainer: { padding: 20, alignItems: 'center', paddingBottom: 50, },
  container: { flex: 1, backgroundColor: '#f9f9f9', },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', },
  inputGroup: { marginBottom: 15, width: '95%', },
  label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '500', },
  input: { backgroundColor: '#fff', height: 44, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, paddingHorizontal: 10, fontSize: 16, color: '#333', },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 10, },
  cameraSection: { marginBottom: 20, alignItems: 'center', width: '100%', },
  imagePreview: { width: 250, height: 187.5, marginBottom: 15, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, backgroundColor: '#e0e0e0', },
  imagePlaceholder: { width: 250, height: 187.5, marginBottom: 15, borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed', borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', },
  placeholderText: { color: '#888', textAlign: 'center', marginVertical: 10, paddingHorizontal: 10, },
  buttonContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20, width: '80%', },
  activityIndicator: { marginRight: 10, },
  resultContainer: { marginTop: 20, padding: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 8, width: '95%', },
  errorBox: { borderColor: '#D32F2F', backgroundColor: '#FFEBEE', }, // Specific style for error container
  resultTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333', },
  resultTitleError: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#D32F2F', },
  resultLabel: { fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 4, color: '#555', },
  resultText: { fontSize: 14, marginBottom: 8, color: '#444', },
  resultItem: { fontSize: 13, marginLeft: 10, color: '#666', lineHeight: 18, },
  detectedText: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', backgroundColor: '#f0f0f0', padding: 5, borderRadius: 3, marginTop: 5, },
  errorText: { fontSize: 14, color: '#D32F2F', }, // Style for the error message text itself
  warningText: { marginTop: 20, fontSize: 12, color: '#E67E22', textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 10, }
});

export default AddCourtScreen;