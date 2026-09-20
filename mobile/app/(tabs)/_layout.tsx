import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '../../src/theme';

function Icon({ children, active }: { children: string; active: boolean }) {
  return (
    <View
      style={{
        width: 32,
        height: 28,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? '#EEF3FF' : 'transparent',
      }}
    >
      <Text style={{ fontSize: 19, opacity: active ? 1 : 0.5 }}>{children}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 76,
          paddingTop: 7,
          paddingBottom: 9,
          paddingHorizontal: 5,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          shadowColor: colors.navy,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 10,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '900' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: ({ focused }) => <Icon active={focused}>⌂</Icon> }} />
      <Tabs.Screen name="products" options={{ title: 'Produits', tabBarIcon: ({ focused }) => <Icon active={focused}>◫</Icon> }} />
      <Tabs.Screen name="cart" options={{ title: 'Panier', tabBarIcon: ({ focused }) => <Icon active={focused}>🛒</Icon> }} />
      <Tabs.Screen name="orders" options={{ title: 'Commandes', tabBarIcon: ({ focused }) => <Icon active={focused}>▣</Icon> }} />
      <Tabs.Screen name="account" options={{ title: 'Compte', tabBarIcon: ({ focused }) => <Icon active={focused}>●</Icon> }} />
    </Tabs>
  );
}
