// app/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../hooks/useAuth';  // Assuming you have an auth hook to track login state

export default function Layout() {
  const { isAuthenticated } = useAuth();  // Check if the user is authenticated
  
  // If user is authenticated, show the tabs screen
  if (isAuthenticated) {
    return (
      <Tabs
        screenOptions={{
          tabBarStyle: { display: 'flex' },  // Show tab bar if authenticated
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="(tabs)/index"
          options={{ title: 'Home' }}
        />
        <Tabs.Screen
          name="(tabs)/explore"
          options={{ title: 'Explore' }}
        />
      </Tabs>
    );
  }

  // If user is not authenticated, show the login screen
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { display: 'none' },  // Hide tab bar on auth screens
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="(auth)/login"
        options={{ title: 'Login' }}
      />
    </Tabs>
  );
}
