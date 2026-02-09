import React from 'react';
import { Stack } from 'expo-router';

/**
 * Records Stack Layout
 */
export default function RecordsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="new" />
      <Stack.Screen name="[recordId]" />
    </Stack>
  );
}
