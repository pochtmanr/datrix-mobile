import React from 'react';
import { Stack } from 'expo-router';

/**
 * Record Detail Stack Layout
 */
export default function RecordDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="fill" />
    </Stack>
  );
}
