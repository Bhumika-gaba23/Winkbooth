import { StyleSheet } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';

function LegacyTabOneScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});

import { router } from "expo-router";
import { Text as NativeText, StyleSheet as NativeStyleSheet, View as NativeView } from "react-native";
import { Screen } from "@/components/Screen";
import { Button, Card, Title } from "@/components/Ui";
import { themes } from "@/constants/theme";
import { useBoothStore } from "@/store/booth";
export default function Home() { const p = themes[useBoothStore((s) => s.theme)]; return <Screen><Title eyebrow="Roll 001 · ready to develop" copy="Pose, play, and turn your camera roll into printable photo strips—all privately on your phone.">Keep the chaos.</Title><Card><NativeView style={[homeStyles.sheet, { backgroundColor: p.ink }]}><NativeView style={[homeStyles.sample, { backgroundColor: p.yellow }]}><NativeText style={homeStyles.emoji}>☺</NativeText></NativeView><NativeView style={[homeStyles.sample, { backgroundColor: p.green }]}><NativeText style={homeStyles.emoji}>✌</NativeText></NativeView><NativeText style={homeStyles.brand}>WinkBooth</NativeText></NativeView></Card><NativeView style={homeStyles.actions}><Button kind="primary" onPress={() => router.push("/(tabs)/booth")}>◉ Start a roll</Button><Button onPress={() => router.push("/(tabs)/gallery")}>Open memory wall →</Button></NativeView><NativeText style={[homeStyles.trust, { color: p.muted }]}>⌁ Private by physics{"\n"}✦ Made for the mess</NativeText></Screen>; }
const homeStyles = NativeStyleSheet.create({ sheet: { padding: 14, borderRadius: 8, transform: [{ rotate: "2deg" }], gap: 8 }, sample: { height: 140, borderWidth: 3, borderColor: "#fff", justifyContent: "center", alignItems: "center" }, emoji: { fontSize: 52 }, brand: { color: "white", textAlign: "center", fontWeight: "800", letterSpacing: 2 }, actions: { gap: 10 }, trust: { fontSize: 13, fontWeight: "700", lineHeight: 24, textAlign: "center" } });
