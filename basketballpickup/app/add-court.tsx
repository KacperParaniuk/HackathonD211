// app/add-court.tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, Button, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router'; // Import Stack for screen options

// --- CameraAlternative Logic (from your example) ---
const AddCourtScreen: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();

  const takePhoto = async () => {
    // Check permissions first
    if (!cameraPermission?.granted) {
        const permissionResult = await requestCameraPermission();
        if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Camera permission is needed to take a photo.");
            return;
        }
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, // Optional: allow editing after taking photo
      aspect: [4, 3],      // Optional: aspect ratio for editing
      quality: 0.8,        // Reduce quality slightly for smaller file size
    });

    console.log(result); // Log the result for debugging

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
      // TODO: Here you would also collect other court details (name, description, location)
      // and eventually save everything (image URI + details) to Firestore/Storage.
    }
  };

  return (
    <View style={styles.container}>
       {/* Configure the header for this screen */}
       <Stack.Screen options={{ title: 'Add New Court' }} />

       <Text style={styles.title}>Add Court Details</Text>

       {/* Placeholder for other input fields */}
       <Text style={styles.placeholderText}>
            (Add fields for Court Name, Description, Location confirmation, etc. here)
       </Text>

        {/* Camera Section */}
        <View style={styles.cameraSection}>
            {image ? (
                <Image source={{ uri: image }} style={styles.imagePreview} />
            ) : (
                <View style={styles.imagePlaceholder}>
                    <Text style={styles.placeholderText}>No photo taken</Text>
                </View>
            )}
            <Button title="Take Photo of Court" onPress={takePhoto} />
        </View>

        {/* Placeholder for Save Button */}
        <Button title="Save Court (Not Implemented)" onPress={() => Alert.alert("TODO", "Implement saving logic")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center', // Center items horizontally
    backgroundColor: '#f9f9f9',
  },
  title: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
  },
  cameraSection: {
      marginVertical: 30,
      alignItems: 'center',
      width: '100%',
  },
  imagePreview: {
    width: 250,
    height: 187.5, // Maintain 4:3 aspect ratio
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  imagePlaceholder: {
      width: 250,
      height: 187.5,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: '#ccc',
      borderStyle: 'dashed',
      borderRadius: 5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#eee',
  },
  placeholderText: {
      color: '#888',
      textAlign: 'center',
      marginVertical: 10,
  }
});

export default AddCourtScreen; // Make sure to have the default export