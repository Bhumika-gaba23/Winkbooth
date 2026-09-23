import { SymbolView } from 'expo-symbols';
import { Link, Tabs } from 'expo-router';
import { Platform, Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function LegacyTabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tab One',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'chevron.left.forwardslash.chevron.right',
                android: 'code',
                web: 'code',
              }}
              tintColor={color}
              size={28}
            />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable style={{ marginRight: 15 }}>
                {({ pressed }) => (
                  <SymbolView
                    name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                    size={25}
                    tintColor={Colors[colorScheme].text}
                    style={{ opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Tab Two',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'chevron.left.forwardslash.chevron.right',
                android: 'code',
                web: 'code',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}

import { Text } from "react-native";
import { themes } from "@/constants/theme";
import { useBoothStore } from "@/store/booth";
const Icon = ({ children }: { children: string }) => <Text style={{ fontSize: 17 }}>{children}</Text>;
export default function WinkBoothTabs() {
  const p = themes[useBoothStore((s) => s.theme)];
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: p.ink, tabBarInactiveTintColor: p.muted, tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.ink + "30", height: 76, paddingTop: 7 }, tabBarLabelStyle: { fontSize: 10, fontWeight: "700" } }}>
    <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: () => <Icon>⌂</Icon> }} />
    <Tabs.Screen name="booth" options={{ title: "Booth", tabBarIcon: () => <Icon>◉</Icon> }} />
    <Tabs.Screen name="gallery" options={{ title: "Gallery", tabBarIcon: () => <Icon>▧</Icon> }} />
    <Tabs.Screen name="features" options={{ title: "Features", tabBarIcon: () => <Icon>✦</Icon> }} />
  </Tabs>;
}
