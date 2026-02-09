import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function ManagerLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf="chart.bar.fill" />
        <Label>לוח בקרה</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="projects">
        <Icon sf="folder.fill" />
        <Label>פרויקטים</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="reports">
        <Icon sf="doc.text.fill" />
        <Label>דוחות</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon sf="person.fill" />
        <Label>פרופיל</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
