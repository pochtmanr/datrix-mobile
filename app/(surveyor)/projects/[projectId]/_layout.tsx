import React from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';

/**
 * Project Detail Stack Layout
 */
export default function ProjectDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="records" />
    </Stack>
  );
}
