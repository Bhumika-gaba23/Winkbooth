import { router } from "expo-router";
import { Text } from "react-native";
import { Card, Button, Title } from "@/components/Ui";
import { ThemePicker } from "@/components/ThemePicker";
import { Screen } from "@/components/Screen";
import { themes } from "@/constants/theme";
import { useBoothStore } from "@/store/booth";

export default function Features() { const p = themes[useBoothStore((s) => s.theme)]; return <Screen><Title eyebrow="Your booth, your mood" copy="Every theme is light, readable, and saved for your next roll.">Features</Title><Card><Text style={{ color: p.ink, fontSize: 17, fontWeight: "900" }}>Pick a light theme</Text><ThemePicker /></Card><Card><Text style={{ color: p.ink, fontSize: 17, fontWeight: "900" }}>Made for real devices</Text><Text style={{ color: p.muted, lineHeight: 21 }}>Camera capture, imported media, native sharing, printing, local gallery storage, and phone-friendly touch targets are designed for iOS and Android.</Text></Card><Button onPress={() => router.push("/vault")}>Private vault</Button><Button onPress={() => router.push("/privacy")}>Privacy</Button><Button onPress={() => router.push("/terms")}>Terms</Button></Screen>; }
