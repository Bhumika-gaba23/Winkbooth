import { Pressable, StyleSheet, Text, View } from "react-native";
import { themes } from "@/constants/theme";
import { useBoothStore } from "@/store/booth";
import type { ThemeId } from "@/types/domain";

export function ThemePicker() { const { theme, setTheme } = useBoothStore(); const current = themes[theme]; return <View style={styles.wrap}>{(Object.keys(themes) as ThemeId[]).map((id) => <Pressable key={id} onPress={() => setTheme(id)} accessibilityRole="button" accessibilityLabel={`Use ${themes[id].label} theme`} style={[styles.swatch, { backgroundColor: themes[id].paper, borderColor: id === theme ? current.ink : themes[id].ink + "35" }]}><View style={[styles.dot, { backgroundColor: themes[id].pink }]} /><Text numberOfLines={1} style={[styles.text, { color: themes[id].ink }]}>{themes[id].label}</Text></Pressable>)}</View>; }
const styles = StyleSheet.create({ wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, swatch: { minHeight: 44, paddingHorizontal: 10, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6 }, dot: { width: 12, height: 12, borderRadius: 6 }, text: { fontSize: 12, fontWeight: "800" } });
