import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthSession } from '../../src/lib/auth'
import { colors } from '../../src/lib/theme'

function TabIcon({ name, focused }) {
  return <Ionicons name={focused ? name : `${name}-outline`} size={22} color={focused ? colors.teal : '#4a5568'} />
}

export default function TabLayout() {
  // No blanket login requirement here — the Peptides encyclopedia tab is
  // open to everyone. Tabs that need an account (Calculator, Stack,
  // Tracker, Profile) gate themselves individually via AuthGate/AuthPrompt.
  const { user, loading } = useAuthSession()
  const router = useRouter()

  useEffect(() => {
    if (loading) return;
    if (user && !user.consent_accepted) {
      router.replace('/consent');
    }
  }, [user, loading]);

  // Only block rendering while we're still figuring out the session, or
  // while a logged-in user is being redirected to accept consent.
  if (loading || (user && !user.consent_accepted)) {
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
      <Tabs.Screen name="index" options={{ title: 'Calculator', tabBarIcon: ({ focused }) => <TabIcon name="calculator" focused={focused} /> }} />
      <Tabs.Screen name="encyclopedia" options={{ title: 'Peptides', tabBarIcon: ({ focused }) => <TabIcon name="book" focused={focused} /> }} />
      <Tabs.Screen name="stack" options={{ title: 'Stack', tabBarIcon: ({ focused }) => <TabIcon name="layers" focused={focused} /> }} />
      <Tabs.Screen name="tracker" options={{ title: 'Tracker', tabBarIcon: ({ focused }) => <TabIcon name="stats-chart" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon name="person-circle" focused={focused} /> }} />
    </Tabs>
  )
}
