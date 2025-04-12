import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <LottieView
        source={require('../assets/animations/dribble.json')} // adjust path if needed
        autoPlay
        loop
        style={styles.animation}
      />
      <Text style={styles.title}>Welcome to Pickup Hoops!</Text>
      <Text style={styles.subtitle}>Find and join local pickup games near you</Text>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DADDD8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  animation: {
    width: 200,
    height: 200,
    marginBottom: 20,
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
});
