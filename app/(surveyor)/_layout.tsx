import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function SurveyorLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf="house.fill" />
        <Label>בית</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="projects">
        <Icon sf="folder.fill" />
        <Label>פרויקטים</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tasks">
        <Icon sf="checkmark.square.fill" />
        <Label>משימות</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon sf="person.fill" />
        <Label>פרופיל</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
