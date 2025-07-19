// client/app/(tabs)/bookmark.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../../constants";
import EmptyState from "../../components/EmptyState";
import ArticleCard from "../../components/ArticleCard";
import { useGlobalContext } from "../../context/GlobalProvider";

const Bookmark = () => {
  const { user, refetchUser } = useGlobalContext();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    if (refetchUser) {
      setRefreshing(true);
      try {
        await refetchUser();
      } finally {
        setRefreshing(false);
      }
    }
  };

  const bookmarked = Array.isArray(user?.articlesBookmarked)
    ? user.articlesBookmarked
    : [];

  return (
    <SafeAreaView className="bg-primary flex-1">
      {user ? (
        <FlatList
          data={bookmarked}
          keyExtractor={(item) => item.$id}
          renderItem={({ item }) => <ArticleCard item={item} />}
          ListHeaderComponent={() => (
            <View className="my-6 px-4 space-y-1">
              <View className="flex-row justify-between items-start mb-6">
                <View>
                  <Text className="font-pmedium text-sm text-gray-100">
                    Welcome Back,
                  </Text>
                  <Text className="text-2xl font-psemibold text-white">
                    {user.username}
                  </Text>
                </View>
                <Image
                  source={images.logoSmall}
                  className="w-9 h-10 mt-1.5"
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text className="text-lg font-psemibold text-white">
                  Bookmarked Articles
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <EmptyState
              title="No Articles Found"
              subtitle="Save articles to see them here."
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={
            bookmarked.length === 0
              ? { flex: 1, justifyContent: "center", alignItems: "center" }
              : undefined
          }
        />
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-white">No user logged in.</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Bookmark;
