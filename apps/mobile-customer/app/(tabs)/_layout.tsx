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
        name="orders" 
        options={{ 
          title: 'Orders',
          tabBarLabel: 'Orders'
        }} 
      />
    </Tabs>
  );
}
