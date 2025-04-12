import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  Alert
} from 'react-native';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { Court } from '../types';

interface Game {
  id: string;
  court: Court;
  time: string;
  playersCount: number;
  skillLevel: string;
  createdAt: Date;
}

const HomeScreen: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigation = useNavigation();

  // Function to fetch games data from Firebase
  const fetchGames = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const gamesRef = collection(db, 'games');
      const q = query(gamesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const gamesData: Game[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        gamesData.push({
          id: doc.id,
          court: data.court,
          time: data.time,
          playersCount: data.playersCount,
          skillLevel: data.skillLevel,
          createdAt: data.createdAt.toDate(), // Convert Firestore timestamp to JS Date
        });
      });
      
      setGames(gamesData);
    } catch (error) {
      console.error('Error fetching games:', error);
      setError('Failed to load games. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchGames();
  }, []);

  // Pull to refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchGames();
  };

  // Navigate to game details
  const handleGamePress = (game: Game) => {
    // You can implement navigation to a detail screen
    // navigation.navigate('GameDetails', { gameId: game.id });
    Alert.alert(
      "Game Details",
      `Court: ${game.court.name || 'Unnamed Court'}\nTime: ${game.time}\nPlayers: ${game.playersCount}\nSkill Level: ${game.skillLevel}`,
      [{ text: "OK" }]
    );
  };

  // Navigate to create game screen
  const handleCreateGame = () => {
    navigation.navigate('MapView' as never);
  };

  // Render each game item
  const renderGameItem = ({ item }: { item: Game }) => (
    <TouchableOpacity 
      style={styles.gameCard}
      onPress={() => handleGamePress(item)}
    >
      <View style={styles.gameCardHeader}>
        <Text style={styles.courtName}>{item.court.name || 'Basketball Court'}</Text>
        <Text style={styles.gameTime}>{item.time}</Text>
      </View>
      
      <View style={styles.gameInfo}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Players:</Text>
          <Text style={styles.infoValue}>{item.playersCount}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Skill Level:</Text>
          <Text style={styles.infoValue}>{item.skillLevel}</Text>
        </View>
      </View>
      
      <Text style={styles.dateText}>
        Created: {item.createdAt.toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const renderWelcomeHeader = () => (
    <View style={styles.welcomeContainer}>
      <LottieView
        source={require('../assets/animations/dribble.json')}
        autoPlay
        loop
        style={styles.animation}
      />
      <Text style={styles.title}>Welcome to Pickup Hoops!</Text>
      <Text style={styles.subtitle}>Find and join local pickup games near you</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Games</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={handleCreateGame}
        >
          <Text style={styles.createButtonText}>+ Create Game</Text>
        </TouchableOpacity>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchGames}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <LottieView
            source={require('../assets/animations/dribble.json')}
            autoPlay
            loop
            style={styles.loadingAnimation}
          />
          <Text style={styles.loadingText}>Loading games...</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          renderItem={renderGameItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={renderWelcomeHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8FB339']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No games available</Text>
              <Text style={styles.emptySubtext}>Create a new game or pull down to refresh</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DADDD8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#4B5842',
    borderBottomWidth: 1,
    borderBottomColor: '#3A4634',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#8FB339',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  welcomeContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 10,
    margin: 12,
  },
  animation: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loadingAnimation: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B5842',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#8FB339',
    textAlign: 'center',
  },
  listContainer: {
    padding: 12,
    paddingTop: 0,
  },
  gameCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  courtName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5842',
    flex: 1,
  },
  gameTime: {
    fontSize: 14,
    color: '#8FB339',
    fontWeight: '600',
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#4B5842',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4B5842',
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5842',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8FB339',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffeeee',
    padding: 16,
    margin: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 8,
  },
  retryText: {
    color: '#8FB339',
    fontWeight: '600',
  },
});

export default HomeScreen;