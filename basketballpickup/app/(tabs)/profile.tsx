// app/(tabs)/map.tsx
// import { View, Text } from 'react-native';

// export default function ProfileScreen() {
//   return (
//     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//       <Text>Profile Screen</Text>
//     </View>
//   );
// }

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';


interface UserProfile {
  displayName?: string;
  email?: string;
  photoURL?: string;
  favoriteSport?: string;
}

export default function Profile() {
  const user = auth.currentUser as User | null;
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const userDoc = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDoc);

        if (docSnap.exists()) {
          setProfileData(docSnap.data() as UserProfile);
        } else {
          // fallback to basic auth data
          setProfileData({
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00FFFF" />
      </View>
    );
  }

  if (!user || !profileData) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>User not logged in.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      {profileData.photoURL ? (
        <Image source={{ uri: profileData.photoURL }} style={styles.avatar} />
      ) : (
        <View style={styles.placeholderAvatar} />
      )}

      <Text style={styles.text}>Name: {profileData.displayName}</Text>
      <Text style={styles.text}>Email: {profileData.email}</Text>
      {profileData.favoriteSport && (
        <Text style={styles.text}>Favorite Sport: {profileData.favoriteSport}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#00FFFF', marginBottom: 20 },
  text: { fontSize: 18, color: '#FFFFFF', marginBottom: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  placeholderAvatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#444', marginBottom: 20
  }
});
