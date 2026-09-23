import { router } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, Card, Title } from "@/components/Ui";
import { PhotoStrip } from "@/components/PhotoStrip";
import { Screen } from "@/components/Screen";
import { savePhoto } from "@/services/gallery";
import { copyCaption, printImage, saveToLibrary, shareFile } from "@/services/media";
import { useBoothStore } from "@/store/booth";
import { themes } from "@/constants/theme";

export default function Export() { const { session, reset, theme } = useBoothStore(); const p = themes[theme]; const source = session.shots[0]; const requireImage = (task: (uri: string) => Promise<void>) => async () => { if (!source) return Alert.alert("Add a photo first", "Capture or import a photo before exporting."); await task(source); }; const keep = requireImage(async (uri) => { await savePhoto({ layoutId: session.layoutId, imageUri: uri, hidden: false }); Alert.alert("Saved", "Your roll has been added to the local memory wall."); }); return <Screen><Title eyebrow="Ready when you are" copy="Exports are kept local until you choose to share.">Keep the little moments.</Title><PhotoStrip compact /><View style={styles.grid}><Button kind="primary" onPress={requireImage(saveToLibrary)}>Download HD</Button><Button onPress={requireImage(shareFile)}>Share</Button><Button onPress={requireImage(printImage)}>Print</Button><Button onPress={() => copyCaption("WinkBooth roll — made privately on my phone.")}>Copy caption</Button></View><Card><Text style={[styles.heading, { color: p.ink }]}>Private by physics</Text><Text style={{ color: p.muted }}>Your gallery, albums, and settings are stored on this device. There are no accounts or uploads.</Text></Card><Button kind="primary" onPress={keep}>Keep in gallery</Button><Button onPress={() => { reset(); router.replace("/(tabs)/booth"); }}>Start another roll</Button></Screen>; }
const styles = StyleSheet.create({ grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, heading: { fontSize: 17, fontWeight: "900" } });
