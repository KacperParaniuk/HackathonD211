import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';

const screenHeight = Dimensions.get('window').height;

interface UserProfile {
  displayName?: string;
  email?: string;
  photoURL?: string;
  favoriteSport?: string;
  age?: number;
  height?: number;
  weight?: number;
  gender?: string;
}

export default function Profile() {
  const user = auth.currentUser as User | null;
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [ageInput, setAgeInput] = useState<string>('');
  const [heightInput, setHeightInput] = useState<string>('');
  const [weightInput, setWeightInput] = useState<string>('');
  const [genderInput, setGenderInput] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const userDoc = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDoc);

        if (docSnap.exists()) {
          setProfileData(docSnap.data() as UserProfile);
        } else {
          setProfileData({
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    try {
      const userDoc = doc(db, 'users', user!.uid);
      await updateDoc(userDoc, {
        age: parseInt(ageInput),
        height: parseInt(heightInput),
        weight: parseInt(weightInput),
        gender: genderInput,
      });

      setEditing(false);
      Alert.alert('Profile updated!');
      setProfileData(prev => prev ? ({
        ...prev,
        age: parseInt(ageInput),
        height: parseInt(heightInput),
        weight: parseInt(weightInput),
        gender: genderInput,
      }) : null);
    } catch (err) {
      console.error(err);
      Alert.alert('Update failed', 'Could not save your changes.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Logout Error', 'Something went wrong logging you out.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8FB339" />
      </View>
    );
  }

  if (!user || !profileData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>User not logged in.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ marginTop: screenHeight * 0.1, width: '100%', alignItems: 'center' }}>
        <Text style={styles.title}>My Profile</Text>

        {profileData.photoURL ? (
          <Image source={{ uri: profileData.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.placeholderAvatar} />
        )}

        <Text style={styles.text}>Name: {profileData.displayName || 'N/A'}</Text>
        <Text style={styles.text}>Email: {profileData.email || 'N/A'}</Text>

        {editing ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Age"
              keyboardType="numeric"
              value={ageInput}
              onChangeText={setAgeInput}
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              placeholder="Height (cm)"
              keyboardType="numeric"
              value={heightInput}
              onChangeText={setHeightInput}
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              placeholder="Weight (kg)"
              keyboardType="numeric"
              value={weightInput}
              onChangeText={setWeightInput}
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              placeholder="Gender"
              value={genderInput}
              onChangeText={setGenderInput}
              placeholderTextColor="#666"
            />
          </>
        ) : (
          <>
            <Text style={styles.text}>Age: {profileData.age ?? 'N/A'}</Text>
            <Text style={styles.text}>Height: {profileData.height ?? 'N/A'} cm</Text>
            <Text style={styles.text}>Weight: {profileData.weight ?? 'N/A'} kg</Text>
            <Text style={styles.text}>Gender: {profileData.gender || 'N/A'}</Text>
          </>
        )}

        <Text style={styles.text}>
          Favorite Sport: {profileData.favoriteSport || 'N/A'}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              if (editing) {
                handleSave();
              } else {
                setAgeInput(profileData.age?.toString() || '');
                setHeightInput(profileData.height?.toString() || '');
                setWeightInput(profileData.weight?.toString() || '');
                setGenderInput(profileData.gender || '');
                setEditing(true);
              }
            }}
          >
            <Text style={styles.buttonText}>{editing ? 'Save Changes' : 'Change Info'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#DADDD8',
    alignItems: 'center',
    flexGrow: 1,
    paddingBottom: 50,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DADDD8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4B5842',
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  placeholderAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#B7CE63',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    width: '85%',
    padding: 12,
    marginVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D59F',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    flexWrap: 'wrap',
  },
  button: {
    backgroundColor: '#8FB339',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginHorizontal: 6,
    marginBottom: 10,
    shadowColor: '#4B5842',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  logoutButton: {
    backgroundColor: '#4B5842',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
