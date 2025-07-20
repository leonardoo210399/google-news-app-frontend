// client/app/search/[query].jsx

import React from "react";
import { SafeAreaView, View, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ArticleWebView() {
  const router = useRouter();
  const { url, title } = useLocalSearchParams();

  const decodedUrl = decodeURIComponent(url);
  const decodedTitle = decodeURIComponent(title);

  return (
    <SafeAreaView className="pt-8 bg-primary flex-1">
      {/* Header */}
      <View className="flex-row items-center h-14 px-4 bg-primary border-b border-black-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#CDCDE0" />
        </TouchableOpacity>
        <Text
          className="text-white text-lg font-psemibold ml-4 flex-1"
          numberOfLines={1}
        >
          {decodedTitle}
        </Text>
      </View>

      {/* WebView */}
      <View className="flex-1">
        <WebView
          source={{ uri: decodedUrl }}
          startInLoadingState
          style={{ flex: 1, backgroundColor: "#000" }}
          renderLoading={() => (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(16,16,16,0.5)", // adjust as needed
                justifyContent: "center",
                alignItems: "center",
                zIndex: 10,
              }}
            >
              <ActivityIndicator size={"large"} color="#FF9C01" />
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
