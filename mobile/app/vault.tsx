import { useState } from "react";
import { Alert, Text, TextInput } from "react-native";
import { Screen } from "@/components/Screen";
import { Button, Card, Title } from "@/components/Ui";
import { themes } from "@/constants/theme";
import { useBoothStore } from "@/store/booth";
import { vaultMetadata } from "@/services/vault";

export default function Vault() { const [secret, setSecret] = useState(""); const p = themes[useBoothStore((s) => s.theme)]; const unlock = async () => { try { const records = await vaultMetadata(secret); Alert.alert("Vault unlocked", `${records.length} protected roll${records.length === 1 ? "" : "s"} on this device.`); } catch (error) { Alert.alert("Vault unavailable", error instanceof Error ? error.message : "Try again."); } }; return <Screen><Title eyebrow="Private vault" copy="A vault uses your chosen secret as its SQLCipher database key.">Unlock your keepsakes</Title><Card><Text style={{ color: p.muted }}>Your secret is never stored by WinkBooth. If you lose it, protected records cannot be recovered.</Text><TextInput secureTextEntry value={secret} onChangeText={setSecret} placeholder="Vault secret" placeholderTextColor={p.muted} style={{ minHeight: 48, borderWidth: 1, borderColor: p.ink + "40", color: p.ink, borderRadius: 12, paddingHorizontal: 12 }} /><Button kind="primary" onPress={unlock}>Unlock vault</Button></Card></Screen>; }
