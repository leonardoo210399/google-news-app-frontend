// client/app/(tabs)/search.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Image,
  Text,
  ActivityIndicator,           // ← import spinner
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EmptyState from "../../components/EmptyState";
import ArticleCard from "../../components/ArticleCard";

import { searchPosts } from "../../lib/appwrite";
import useAppwrite from "../../lib/useAppwrite";
import { icons } from "@/constants";

export default function Search() {
  const [query, setQuery] = useState("");
  const POSTS_PER_PAGE = 10;

  // pagination state
  const [offset, setOffset] = useState(0);
  const [allPosts, setAllPosts] = useState([]);

  // build fetchFn with both query & offset
  const fetchFn = useCallback(
    () => searchPosts(query.trim(), offset, POSTS_PER_PAGE),
    [query, offset]
  );

  const {
    data: page = { documents: [] },
    refetch,
    loading,
  } = useAppwrite(fetchFn);

  // when a new page comes in, either reset or append (deduped)
  useEffect(() => {
    if (offset === 0) {
      setAllPosts(page.documents);
    } else {
      setAllPosts((prev) => {
        const newDocs = page.documents.filter(
          (doc) => !prev.some((p) => p.$id === doc.$id)
        );
        return [...prev, ...newDocs];
      });
    }
  }, [page.documents, offset]);

  // on query change: reset & fetch first page
  useEffect(() => {
    setOffset(0);
    setAllPosts([]);
    refetch();
  }, [query]);

  // on offset change (>0): fetch next page
  useEffect(() => {
    if (offset > 0) {
      refetch();
    }
  }, [offset]);

  // pull-to-refresh: reset everything & fetch first page
  const onRefresh = () => {
    setOffset(0);
    setAllPosts([]);
    refetch();
  };

  // infinite-scroll: bump offset if last page was full
  const onEndReached = () => {
    if (!loading && page.documents.length === POSTS_PER_PAGE) {
      setOffset((prev) => prev + POSTS_PER_PAGE);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      {/* header + search bar */}
      <View className="px-4 my-6">
        <Text className="text-3xl text-white font-psemibold py-3">
          Search
        </Text>
        <View className="flex flex-row items-center space-x-4 w-full h-16 px-4 bg-black-100 rounded-2xl border-2 border-black-200">
          <TextInput
            className="text-base text-white flex-1 font-pregular"
            value={query}
            placeholder="E.g. Bitcoin price, Ethereum..."
            placeholderTextColor="#CDCDE0"
            onChangeText={setQuery}
          />
          <TouchableOpacity onPress={onRefresh}>
            <Image
              source={icons.search}
              className="w-5 h-5"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* results with infinite scroll */}
      <FlatList
        data={allPosts}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <ArticleCard item={item} />}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        // show spinner at the bottom when loading more pages
        ListFooterComponent={
          loading && offset > 0 ? (
            <View className="py-4">
              <ActivityIndicator />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title={loading ? "Loading…" : "No Results Found"}
            subtitle={
              loading
                ? ""
                : `We couldn’t find anything for “${query.trim()}”`
            }
          />
        }
      />
    </SafeAreaView>
  );
}
