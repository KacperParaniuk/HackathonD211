// app/(auth)/login.tsx
import { View, Text, TextInput, Button } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';  // Import the router for navigation
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';  // Import Firebase authentication instance

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      // Firebase sign in method
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)');  // Redirect to tabs after successful login
    } catch (error) {
      setError('Invalid credentials, please try again.');
    }
  };

  return (
    <View>
      <Text>Login</Text>
      {error ? <Text>{error}</Text> : null}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
};

export default LoginScreen;
