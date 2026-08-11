import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen 
        name="gallery" 
        options={{ 
          title: 'Gallery',
          tabBarLabel: 'Gallery'
        }} 
      />
      <Tabs.Screen 
        name="ai-curation" 
        options={{ 
          title: 'AI Magic',
          tabBarLabel: 'AI Magic'
        }} 
      />
      <Tabs.Screen 
        name="face-search" 
        options={{ 
          title: 'Find Me',
          tabBarLabel: 'Find Me'
        }} 
      />
      <Tabs.Screen 
        name="orders" 
        options={{ 
          title: 'Orders',
          tabBarLabel: 'Orders'
        }} 
      />
    </Tabs>
  );
}
