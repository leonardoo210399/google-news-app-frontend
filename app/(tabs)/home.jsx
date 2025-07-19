// screens/Home.jsx (updated to use ArticleCard)
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
import SearchInput from "../../components/SearchInput";
import Trending from "../../components/Trending";
import EmptyState from "../../components/EmptyState";
import { fetchLatestArticles, fetchEditorsPick } from "../../lib/appwrite";
import useAppwrite from "../../lib/useAppwrite";
import ArticleCard from "../../components/ArticleCard";
import { useGlobalContext } from "../../context/GlobalProvider";

const Home = () => {
  const { user } = useGlobalContext();

  const { data: posts, refetch } = useAppwrite(fetchLatestArticles);
  const { data: latestPosts } = useAppwrite(fetchEditorsPick);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="bg-primary flex-1">
      <FlatList
        data={posts}
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
                  {user?.username}
                </Text>
              </View>
              <Image
                source={images.logoSmall}
                className="w-9 h-10 mt-1.5"
                resizeMode="contain"
              />
            </View>

            <View className="">
              <Text className="text-lg font-pregular text-gray-100 mb-3">
                Editor's Choice
              </Text>
              <Trending posts={latestPosts ?? []} />
            </View>
            {/* NEW: Latest Articles Heading */}
            <View>
              <Text className="text-lg font-psemibold text-white">
                Latest Articles
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="No Articles Found"
            subtitle="Be the first one to upload an article."
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

export default Home;
