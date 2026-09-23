import { Text } from "react-native";
import { Screen } from "@/components/Screen";
import { Title, Card } from "@/components/Ui";
import { themes } from "@/constants/theme";
import { useBoothStore } from "@/store/booth";
export default function Terms() { const p = themes[useBoothStore((s) => s.theme)]; return <Screen><Title eyebrow="Terms">Keep it kind.</Title><Card><Text style={{ color: p.ink, lineHeight: 22 }}>You are responsible for the media you create and share. Use the app only with permission from everyone pictured. Device storage and system sharing controls remain under your control.</Text></Card></Screen>; }
