import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { Text } from 'react-native'
import { useAuthSession } from '../../src/lib/auth'
import { colors } from '../../src/lib/theme'

function TabIcon({ icon }) {
  return <Text style={{ fontSize: 20 }}>{icon}</Text>
}

export default function TabLayout() {
  const { user, loading } = useAuthSession()
  const router = useRouter()

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (!user.consent_accepted) {
      router.replace('/consent');
    }
  }, [user, loading]);

  if (loading || !user || !user.consent_accepted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.teal} size="large" />
      </View>
    );
  }

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
      <Tabs.Screen name="index" options={{ title: 'Calculator', tabBarIcon: () => <TabIcon icon="⚗️" /> }} />
      <Tabs.Screen name="encyclopedia" options={{ title: 'Peptides', tabBarIcon: () => <TabIcon icon="📖" /> }} />
      <Tabs.Screen name="stack" options={{ title: 'Stack', tabBarIcon: () => <TabIcon icon="🔬" /> }} />
      <Tabs.Screen name="tracker" options={{ title: 'Tracker', tabBarIcon: () => <TabIcon icon="📊" /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => <TabIcon icon="👤" /> }} />
    </Tabs>
  )
}
