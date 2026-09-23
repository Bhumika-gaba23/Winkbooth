import { Text } from "react-native";
import { Screen } from "@/components/Screen";
import { Title, Card } from "@/components/Ui";
import { themes } from "@/constants/theme";
import { useBoothStore } from "@/store/booth";
export default function Privacy() { const p = themes[useBoothStore((s) => s.theme)]; return <Screen><Title eyebrow="Privacy">Local by default</Title><Card><Text style={{ color: p.ink, lineHeight: 22 }}>WinkBooth processes captures on your device. Camera, microphone, photo-library, and sharing access are used only after you choose an action. No account, cloud sync, or analytics service is required.</Text></Card></Screen>; }
