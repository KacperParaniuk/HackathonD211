import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase';
import { router } from 'expo-router';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  // Sign-up specific fields
  const [DisplayName, setDisplayName] = useState('');
  const [Fname, setFname] = useState('');
  const [Lname, setLname] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/(tabs)');
      }
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
  
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
  
        await setDoc(doc(db, 'users', userCred.user.uid), {
          email,
          DisplayName,
          Fname,
          Lname,
          age,
          height,
          weight,
          gender,
          createdAt: new Date(),
        });
      }
    } catch (error: any) {
      Alert.alert('Error', 'Email or Password is incorrect');
    }
  };
  

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Enter your email first!');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Password reset email sent!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{'PickupHoops'}</Text>
      <Text style={styles.Login}>{isLogin ? 'Login' : 'Sign Up'}</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      

      {!isLogin && (
        <>
            <TextInput
                placeholder="Display Name"
                style={styles.input}
                value={DisplayName}
                onChangeText={setDisplayName}
            />
            <TextInput
                placeholder="First Name"
                style={styles.input}
                value={Fname}
                onChangeText={setFname}
            />
            <TextInput
                placeholder="Last Name"
                style={styles.input}
                value={Lname}
                onChangeText={setLname}
            />
          <TextInput
            placeholder="Age"
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
          />
          <TextInput
            placeholder="Height (e.g. 6'2 or 188cm)"
            style={styles.input}
            value={height}
            onChangeText={setHeight}
          />
          <TextInput
            placeholder="Weight (lbs or kg)"
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
          />
          <TextInput
            placeholder="Gender"
            style={styles.input}
            value={gender}
            onChangeText={setGender}
          />
        </>
      )}

      

      <Button title={isLogin ? 'Login' : 'Sign Up'} onPress={handleSubmit} />

      <Text style={styles.switchText} onPress={() => setIsLogin(!isLogin)}>
        {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
      </Text>
      {isLogin && (
        <Text style={styles.forgotPassword} onPress={handleForgotPassword}>
          Forgot Password?
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 40,
  },
  Login: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    padding: 8,
  },
  forgotPassword: {
    color: 'blue',
    textAlign: 'center',
    marginBottom: 12,
  },
  switchText: {
    textAlign: 'center',
    color: 'blue',
    marginTop: 20,
    marginBottom: 12,
  },
});
