import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text, Alert } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../app/firebase'; // adjust path based on where you keep your config

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Bio fields for sign up
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [skillLevel, setSkillLevel] = useState('');

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert('Login successful!');
      // Navigate to main screen
    } catch (error: any) {
      Alert.alert('Login failed', error.message);
    }
  };

  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save additional info to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        age: parseInt(age),
        height,
        weight,
        skillLevel,
      });

      Alert.alert('Signup successful!');
      // Navigate to main screen
    } catch (error: any) {
      Alert.alert('Signup failed', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSigningUp ? 'Sign Up' : 'Login'}</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      {isSigningUp && (
        <>
          <TextInput
            placeholder="Age"
            value={age}
            onChangeText={setAge}
            style={styles.input}
            keyboardType="numeric"
          />
          <TextInput
            placeholder="Height (e.g., 6'1 or 185cm)"
            value={height}
            onChangeText={setHeight}
            style={styles.input}
          />
          <TextInput
            placeholder="Weight (lbs or kg)"
            value={weight}
            onChangeText={setWeight}
            style={styles.input}
          />
          <TextInput
            placeholder="Skill Level (e.g., Beginner, Intermediate, Pro)"
            value={skillLevel}
            onChangeText={setSkillLevel}
            style={styles.input}
          />
        </>
      )}

      <Button
        title={isSigningUp ? 'Sign Up' : 'Login'}
        onPress={isSigningUp ? handleSignUp : handleLogin}
      />

      <Text
        style={styles.switchText}
        onPress={() => setIsSigningUp(!isSigningUp)}
      >
        {isSigningUp ? 'Already have an account? Log in' : 'No account? Sign up'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    borderRadius: 6,
    padding: 12,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  switchText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#007bff',
  },
});

export default LoginScreen;
