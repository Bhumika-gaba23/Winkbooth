import * as Clipboard from "expo-clipboard";
import * as MediaLibrary from "expo-media-library";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

export async function shareFile(uri: string) { if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your WinkBooth strip" }); else Alert.alert("Sharing unavailable", "Sharing is not available on this device."); }
export async function saveToLibrary(uri: string) { const permission = await MediaLibrary.requestPermissionsAsync(); if (!permission.granted) return Alert.alert("Permission needed", "Allow photo access to save this strip."); await MediaLibrary.saveToLibraryAsync(uri); Alert.alert("Saved", "Your strip is now in your photo library."); }
export async function printImage(uri: string) { const html = `<img src="${uri}" style="width:100%;height:100%;object-fit:contain" />`; const { uri: printUri } = await Print.printToFileAsync({ html }); if (Platform.OS === "ios") await Print.selectPrinterAsync(); await shareFile(printUri); }
export const copyCaption = (caption: string) => Clipboard.setStringAsync(caption);
