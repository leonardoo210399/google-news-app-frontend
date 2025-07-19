// components/ArticleCard.jsx
import React from "react";
import { View, Text, Image, TouchableOpacity, Linking } from "react-native";
import { useRouter } from "expo-router";

const ArticleCard = ({ item }) => {
  const router = useRouter();
  const {
    titleUrl,
    title,
    summary,
    imageUrl,
    author,
    datetime,
    categories = [],
  } = item;

  const publishedAt = new Date(datetime).toLocaleDateString();
  const payload = encodeURIComponent(JSON.stringify(item));

  // handler for tapping the card
  const goToDetail = () => {
    router.push(`/raw/${payload}`);
  };

  return (
    <TouchableOpacity
      onPress={goToDetail}
      activeOpacity={0.8}
      className="px-4 mb-8 bg-gray-900 rounded-xl overflow-hidden"
    >
      {/* Thumbnail still opens externally if tapped */}
      <View className="w-full h-60">
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-full rounded-xl overflow-hidden"
          resizeMode="cover"
        />
      </View>

      {/* Article details */}
      <View className="mt-3">
        <Text className="text-lg font-psemibold text-white" numberOfLines={2}>
          {title}
        </Text>
        {summary && (
          <Text
            className="text-sm font-pregular text-gray-100 mt-1"
            numberOfLines={2}
          >
            {summary}
          </Text>
        )}

        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-xs font-pregular text-gray-400">
            {author} • {publishedAt}
          </Text>
        </View>

        {categories.length > 0 && (
          <View className="flex-row flex-wrap mt-2">
            {categories.map((cat, i) => (
              <View
                key={`${cat}-${i}`}
                className="mr-2 mb-1 px-2 py-1 bg-gray-800 rounded"
              >
                <Text className="text-xs text-gray-300">{cat}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default ArticleCard;
