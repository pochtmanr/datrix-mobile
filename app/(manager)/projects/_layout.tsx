import React from 'react';
import { Stack } from 'expo-router';

/**
 * Manager Projects Stack Layout
 */
export default function ManagerProjectsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_left',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[projectId]" />
    </Stack>
  );
}
