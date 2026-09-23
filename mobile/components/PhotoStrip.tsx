import { Image, StyleSheet, Text, View } from "react-native";
import { layouts } from "@/constants/catalog";
import { themes } from "@/constants/theme";
import { useBoothStore } from "@/store/booth";

export function PhotoStrip({ compact = false }: { compact?: boolean }) {
  const { session, theme } = useBoothStore();
  const p = themes[theme];
  const layout = layouts.find((item) => item.id === session.layoutId) ?? layouts[0];
  return <View style={[styles.strip, compact && styles.compact, { backgroundColor: session.frameColor, borderColor: p.ink }]}>
    <View style={styles.photos}>{layout.slots.map((slot, index) => <View key={index} style={[styles.slot, { left: `${slot.x * 100}%`, top: `${slot.y * 100}%`, width: `${slot.w * 100}%`, height: `${slot.h * 100}%`, backgroundColor: p.surface2 }]}>{session.shots[index] ? <Image source={{ uri: session.shots[index] }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : <Text style={[styles.placeholder, { color: p.muted }]}>{index + 1}</Text>}</View>)}</View>
    {session.overlays.map((item) => <Text key={item.id} style={[styles.overlay, { left: `${item.x}%`, top: `${item.y}%`, color: item.color, fontSize: item.size ?? 25 }]}>{item.value}</Text>)}
    <View style={styles.footer}>{session.showBranding && <Text style={[styles.brand, { color: session.labelColor }]}>WinkBooth</Text>}{session.showDate && <Text style={[styles.date, { color: session.labelColor }]}>{new Date(session.createdAt).toLocaleDateString()}</Text>}</View>
  </View>;
}

const styles = StyleSheet.create({ strip: { width: "100%", aspectRatio: .58, borderWidth: 1.5, borderRadius: 3, padding: 10, overflow: "hidden" }, compact: { maxWidth: 210, alignSelf: "center" }, photos: { flex: 1, position: "relative" }, slot: { position: "absolute", overflow: "hidden", alignItems: "center", justifyContent: "center" }, placeholder: { fontWeight: "800", fontSize: 18 }, overlay: { position: "absolute", zIndex: 3 }, footer: { minHeight: 27, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }, brand: { fontWeight: "900", fontSize: 12 }, date: { fontSize: 9 } });
