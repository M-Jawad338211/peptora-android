import { Tabs } from 'expo-router'
import { Text } from 'react-native'

function TabIcon({ icon }) {
  return <Text style={{ fontSize: 20 }}>{icon}</Text>
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarStyle: {
        backgroundColor: '#1e2d42',
        borderTopColor: 'rgba(255,255,255,0.08)',
        height: 88,
        paddingBottom: 28,
      },
      tabBarActiveTintColor: '#00d68f',
      tabBarInactiveTintColor: '#4a5568',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      headerStyle: { backgroundColor: '#1a2535' },
      headerTintColor: '#e8edf5',
      headerTitleStyle: { fontWeight: '700' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Calculator', tabBarIcon: ({ color }) => <TabIcon icon="⚗️" /> }} />
      <Tabs.Screen name="encyclopedia" options={{ title: 'Peptides', tabBarIcon: ({ color }) => <TabIcon icon="📖" /> }} />
      <Tabs.Screen name="stack" options={{ title: 'Stack', tabBarIcon: ({ color }) => <TabIcon icon="🔬" /> }} />
      <Tabs.Screen name="tracker" options={{ title: 'Tracker', tabBarIcon: ({ color }) => <TabIcon icon="📊" /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <TabIcon icon="👤" /> }} />
    </Tabs>
  )
}
