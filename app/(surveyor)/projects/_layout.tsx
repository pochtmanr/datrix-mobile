import React from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';

/**
 * Projects Stack Layout
 * Nested stack navigation within the Projects tab
 */
export default function ProjectsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[projectId]" />
    </Stack>
  );
}
