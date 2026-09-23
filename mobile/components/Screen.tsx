import { PropsWithChildren } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, View } from "react-native";
import { themes } from "@/constants/theme";
import { useBoothStore } from "@/store/booth";

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) { const palette = themes[useBoothStore((state) => state.theme)]; const content = <View style={styles.content}>{children}</View>; return <SafeAreaView style={[styles.safe, { backgroundColor: palette.paper }]} edges={["top", "left", "right"]}>{scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}</SafeAreaView>; }
const styles = StyleSheet.create({ safe: { flex: 1 }, scroll: { flexGrow: 1, paddingBottom: 108 }, content: { flex: 1, paddingHorizontal: 18, gap: 16 } });
