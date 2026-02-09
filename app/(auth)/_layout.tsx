import React from 'react';
import { Stack } from 'expo-router';

/**
 * Auth Layout
 * Stack navigator for authentication screens (no tabs)
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="email-login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="pending-approval" />
    </Stack>
  );
}
