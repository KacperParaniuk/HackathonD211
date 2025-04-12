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
  Modal,
} from 'react-native';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
// import { User } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons'; // Make sure to install expo vector icons
import { signOut, User } from 'firebase/auth';

const { width, height } = Dimensions.get('window');

interface UserProfile {
  DisplayName?: string;
  email?: string;
  photoURL?: string;
  favoriteSport?: string;
  age?: number;
  height?: number;
  weight?: number;
  gender?: string;
}

interface Friend {
  id: string;
  DisplayName: string;
  photoURL?: string;
  favoriteSport?: string;
}

export default function Profile() {
  const user = auth.currentUser as User | null;
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const [ageInput, setAgeInput] = useState<string>('');
  const [heightInput, setHeightInput] = useState<string>('');
  const [weightInput, setWeightInput] = useState<string>('');
  const [genderInput, setGenderInput] = useState<string>('');
  const [findFriendsModalVisible, setFindFriendsModalVisible] = useState(false);

  const fakeFriendSuggestions: Friend[] = [
    { id: 'f1', DisplayName: 'Michael Jordan', favoriteSport: 'Basketball' },
    { id: 'f2', DisplayName: 'LeBron James', favoriteSport: 'Basketball' },
    { id: 'f3', DisplayName: 'Adem Bona', favoriteSport: 'Basketball' },
    { id: 'f4', DisplayName: 'Jarrett Allen', favoriteSport: 'Basketball' },
  ];


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
            DisplayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
          });
        }

        // Fetch friends
        // This is a simplistic approach - you might have a different schema
        const friendsQuery = query(
          collection(db, 'friendships'),
          where('userId', '==', user.uid),
          limit(5)
        );
        
        const friendsSnapshot = await getDocs(friendsQuery);
        const friendsList: Friend[] = [];
        
        for (const doc of friendsSnapshot.docs) {
          const friendData = doc.data();
          const friendId = friendData.friendId;
          
          // Fetch friend's profile data
        
        }
        
        setFriends(friendsList);
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
        age: parseInt(ageInput) || null,
        height: parseInt(heightInput) || null,
        weight: parseInt(weightInput) || null,
        gender: genderInput,
      });

      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
      
      setProfileData(prev => prev ? ({
        ...prev,
        age: parseInt(ageInput) || prev.age,
        height: parseInt(heightInput) || prev.height,
        weight: parseInt(weightInput) || prev.weight,
        gender: genderInput || prev.gender,
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


  const openEditModal = () => {
    if (profileData) {
      setAgeInput(profileData.age?.toString() || '');
      setHeightInput(profileData.height?.toString() || '');
      setWeightInput(profileData.weight?.toString() || '');
      setGenderInput(profileData.gender || '');
      setEditModalVisible(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4C68D7" />
      </View>
    );
  }

  if (!user || !profileData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>User not logged in.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        {profileData.photoURL ? (
          <Image source={{ uri: profileData.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.placeholderAvatar}>
            <Text style={styles.avatarText}>
              {profileData.DisplayName?.substring(0, 2).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{profileData.DisplayName || 'No Name'}</Text>
        <Text style={styles.email}>{profileData.email || 'No Email'}</Text>
      </View>

      {/* Personal Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Personal Info</Text>
          <TouchableOpacity onPress={openEditModal} style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color="#4C68D7" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Age:</Text>
            <Text style={styles.infoValue}>{profileData.age ?? 'Not set'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="resize-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Height:</Text>
            <Text style={styles.infoValue}>{profileData.height ? `${profileData.height} cm` : 'Not set'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="fitness-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Weight:</Text>
            <Text style={styles.infoValue}>{profileData.weight ? `${profileData.weight} kg` : 'Not set'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Gender:</Text>
            <Text style={styles.infoValue}>{profileData.gender || 'Not set'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="basketball-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Favorite Sport:</Text>
            <Text style={styles.infoValue}>{profileData.favoriteSport || 'Not set'}</Text>
          </View>
        </View>
      </View>

      {/* Friends Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Friends</Text>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="people-outline" size={20} color="#4C68D7" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.friendsContainer}>
          {friends.length > 0 ? (
            friends.map((friend) => (
              <View key={friend.id} style={styles.friendCard}>
                {friend.photoURL ? (
                  <Image source={{ uri: friend.photoURL }} style={styles.friendAvatar} />
                ) : (
                  <View style={styles.friendPlaceholderAvatar}>
                    <Text style={styles.friendAvatarText}>
                      {friend.DisplayName.substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.friendName}>{friend.DisplayName}</Text>
                {friend.favoriteSport && (
                  <View style={styles.sportBadge}>
                    <Text style={styles.sportText}>{friend.favoriteSport}</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyFriends}>
              <Ionicons name="people" size={40} color="#ccc" />
              <Text style={styles.emptyText}>No friends added yet</Text>
              
              <TouchableOpacity
                style={styles.addFriendButton}
                onPress={() => setFindFriendsModalVisible(true)}
>
                <Text style={styles.addFriendText}>Find Friends</Text>
                </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Logout',
                onPress: handleLogout,
                style: 'destructive',
              },
            ],
            { cancelable: true }
          );
        }}
      >
        <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.logoutIcon} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Edit Profile Modal */}

        <Modal
    animationType="slide"
    transparent={true}
    visible={findFriendsModalVisible}
    onRequestClose={() => setFindFriendsModalVisible(false)}
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Suggested Friends</Text>
          <TouchableOpacity onPress={() => setFindFriendsModalVisible(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {fakeFriendSuggestions.map(friend => (
          <View key={friend.id} style={styles.friendCard}>
            <View style={styles.friendPlaceholderAvatar}>
              <Text style={styles.friendAvatarText}>
                {friend.DisplayName[0]}
              </Text>
            </View>
            <Text style={styles.friendName}>{friend.DisplayName}</Text>
            {friend.favoriteSport && (
              <View style={styles.sportBadge}>
                <Text style={styles.sportText}>{friend.favoriteSport}</Text>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton, { alignSelf: 'center', marginTop: 16 }]}
          onPress={() => setFindFriendsModalVisible(false)}
        >
          <Text style={styles.cancelButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your age"
                keyboardType="numeric"
                value={ageInput}
                onChangeText={setAgeInput}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your height"
                keyboardType="numeric"
                value={heightInput}
                onChangeText={setHeightInput}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your weight"
                keyboardType="numeric"
                value={weightInput}
                onChangeText={setWeightInput}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Gender</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your gender"
                value={genderInput}
                onChangeText={setGenderInput}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]} 
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]} 
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#fff',
  },
  placeholderAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4C68D7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    padding: 8,
  },
  cardContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  friendsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  friendCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  friendAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  friendPlaceholderAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  friendAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  friendName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  sportBadge: {
    backgroundColor: '#e1e8ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 5,
  },
  sportText: {
    fontSize: 10,
    color: '#4C68D7',
  },
  emptyFriends: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    marginBottom: 15,
  },
  addFriendButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addFriendText: {
    color: '#4C68D7',
    fontWeight: '500',
  },
  // Logout button styles
  logoutButton: {
    backgroundColor: '#ff3b30',
    margin: 16,
    marginTop: 8,
    marginBottom: 30,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutIcon: {
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f5f7',
    color: '#333',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4C68D7',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});