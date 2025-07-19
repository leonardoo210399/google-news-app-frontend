import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons, images } from "../../constants";
import SearchInput from "../../components/SearchInput";
import Trending from "../../components/Trending";
import EmptyState from "../../components/EmptyState";
import InfoBox from "../../components/InfoBox";
import {
  fetchLatestArticles,
  getAllPosts,
  getLatestPosts,
  getUserPosts,
  searchPosts,
  signOut,
} from "../../lib/appwrite";
import useAppwrite from "../../lib/useAppwrite";
import VideoCard from "../../components/VideoCard";
import { useGlobalContext } from "../../context/GlobalProvider";
import { router } from "expo-router";
import ArticleCard from "@/components/ArticleCard";

const Profile = () => {
  const { user, setUser, setIsLogged } = useGlobalContext();
  const { data: posts } = useAppwrite(() => fetchLatestArticles());

  const logout = async () => {
    await signOut();
    setUser(null);
    setIsLogged(false);
    router.replace("/sign-in");
  };
  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={null}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <ArticleCard item={item} />}
        ListHeaderComponent={() => (
          <>
            <View className="w-full flex justify-center items-center mt-6 mb-12 px-4">
              <TouchableOpacity
                onPress={logout}
                className="flex w-full items-end mb-10"
              >
                <Image
                  source={icons.logout}
                  resizeMode="contain"
                  className="w-6 h-6"
                />
              </TouchableOpacity>
              <View className="w-16 h-16 border border-secondary rounded-lg flex justify-center items-center">
                <Image
                  source={{ uri: user?.avatar }}
                  className="w-[90%] h-[90%] rounded-lg"
                  resizeMode="cover"
                />
              </View>
              <InfoBox
                title={user?.username}
                containerStyles="mt-5"
                titleStyles="text-lg"
              />
              <View className="mt-5 flex flex-row">
              <InfoBox
                title={posts.length || 0}
                subtitle="Posts"
                titleStyles="text-xl"
                containerStyles="mr-10"
              />
              <InfoBox
                title={user.articlesBookmarked?.length}
                subtitle="Bookmarks"
                titleStyles="text-xl"
              />
            </View>
            </View>
          </>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="No Videos Found"
            subtitle="No videos founf for this search query"
          />
        )}
      />
    </SafeAreaView>
  );
};

export default Profile;
