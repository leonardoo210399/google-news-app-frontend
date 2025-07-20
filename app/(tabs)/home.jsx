// screens/Home.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { images } from "../../constants";
import SearchInput from "../../components/SearchInput";
import Trending from "../../components/Trending";
import EmptyState from "../../components/EmptyState";
import { fetchEditorsPick, searchPosts } from "../../lib/appwrite";
import useAppwrite from "../../lib/useAppwrite";
import ArticleCard from "../../components/ArticleCard";
import { useGlobalContext } from "../../context/GlobalProvider";

const POSTS_PER_PAGE = 10;

const Home = () => {
  const { user } = useGlobalContext();
  const { data: latestPosts } = useAppwrite(fetchEditorsPick);

  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [allPosts, setAllPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // build fetchFn for pagination
  const fetchFn = useCallback(
    () => searchPosts(query.trim(), offset, POSTS_PER_PAGE),
    [query, offset]
  );
  const {
    data: page = { documents: [] },
    refetch,
    loading,
  } = useAppwrite(fetchFn);

  // merge or reset posts on new page
  useEffect(() => {
    setAllPosts((prev) =>
      offset === 0
        ? page.documents
        : [
            ...prev,
            ...page.documents.filter(
              (doc) => !prev.some((p) => p.$id === doc.$id)
            ),
          ]
    );
  }, [page.documents, offset]);

  // reset and fetch when search query changes
  useEffect(() => {
    setOffset(0);
    setAllPosts([]);
    refetch();
  }, [query]);

  // fetch next page when offset > 0
  useEffect(() => {
    if (offset > 0) refetch();
  }, [offset]);

  // manual pull-to-refresh: force fresh page
  const onRefresh = async () => {
    setRefreshing(true);
    setOffset(0);
    try {
      const fresh = await searchPosts(query.trim(), 0, POSTS_PER_PAGE);
      setAllPosts(fresh.documents);
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // pagination trigger
  const onEndReached = () => {
    if (!loading && page.documents.length === POSTS_PER_PAGE) {
      setOffset((prev) => prev + POSTS_PER_PAGE);
    }
  };

  // header with welcome & search
  const listHeader = useMemo(
    () => (
      <View className="bg-primary py-6 px-4 z-10">
        <View className="flex-row justify-between items-center">
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
            className="w-9 h-10"
            resizeMode="contain"
          />
        </View>
      </View>
    ),
    [user?.username, query]
  );

  // build list items: editor block, heading, then articles
  const flatData = useMemo(
    () => [{ type: "editor" }, { type: "heading" }, ...allPosts],
    [allPosts]
  );

  const renderItem = useCallback(
    ({ item }) => {
      if (item.type === "editor") {
        return (
          <View className="px-4 py-4 bg-primary">
            <Text className="text-lg font-pregular text-gray-100 mb-3">
              Editor's Choice
            </Text>
            <Trending posts={latestPosts ?? []} />
          </View>
        );
      }
      if (item.type === "heading") {
        return (
          <View className="px-4 py-2 bg-primary">
            <Text className="text-lg font-psemibold text-white">
              Latest Articles
            </Text>
          </View>
        );
      }
      return <ArticleCard item={item} />;
    },
    [latestPosts]
  );

  return (
    <SafeAreaView className="bg-primary flex-1">
      <FlatList
        data={flatData}
        keyExtractor={(item) => (item.type ? item.type : item.$id)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        stickyHeaderIndices={[0]}
        ListHeaderComponentStyle={{ zIndex: 10, elevation: 10 }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && offset > 0 ? (
            <View className="py-4">
              <ActivityIndicator />
            </View>
          ) : null
        }
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
