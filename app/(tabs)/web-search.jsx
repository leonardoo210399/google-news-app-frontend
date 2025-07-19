import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import xml2js from "react-native-xml2js";
import { useRouter } from "expo-router";

import EmptyState from "../../components/EmptyState";
import { icons } from "@/constants";
import languages from "@/assets/googleParameters/google-languages.json";
import countries from "@/assets/googleParameters/google-countries.json";

const HL_OPTIONS = languages.map(({ language_code, language_name }) => ({
  label: `${language_name} (${language_code})`,
  value: language_code,
}));
const GL_OPTIONS = countries.map(({ country_code, country_name }) => ({
  label: `${country_name} (${country_code.toUpperCase()})`,
  value: country_code.toUpperCase(),
}));
const WHEN_OPTIONS = [
  { label: "Last hour", value: "1h" },
  { label: "Last 6 hours", value: "6h" },
  { label: "Last 12 hours", value: "12h" },
  { label: "Last day (24h)", value: "1d" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last month (1m)", value: "1m" },
  { label: "Last 3 months", value: "3m" },
];

export default function WebSearch() {
  const router = useRouter();

  // --- Basic search ---
  const [query, setQuery] = useState("");

  // --- Advanced filters ---
  const [whenRange, setWhenRange] = useState("");
  const [afterDate, setAfterDate] = useState(null);
  const [beforeDate, setBeforeDate] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAfterPicker, setShowAfterPicker] = useState(false);
  const [showBeforePicker, setShowBeforePicker] = useState(false);

  // --- Locale ---
  const [hl, setHl] = useState("en");
  const [gl, setGl] = useState("IN");
  const [ceid, setCeid] = useState(`${gl}:${hl}`);
  useEffect(() => setCeid(`${gl}:${hl}`), [gl, hl]);

  // --- Loading & articles ---
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState([]);

  const buildQueryParam = () => {
    const parts = [];
    if (query.trim()) parts.push(query.trim());
    if (whenRange) {
      parts.push(`when:${whenRange}`);
    } else {
      if (afterDate)
        parts.push(`after:${afterDate.toISOString().slice(0, 10)}`);
      if (beforeDate)
        parts.push(`before:${beforeDate.toISOString().slice(0, 10)}`);
    }
    return encodeURIComponent(parts.join(" "));
  };

  const fetchNews = useCallback(async () => {
    const q = buildQueryParam();
    if (!q) {
      setArticles([]);
      return;
    }
    setLoading(true);
    try {
      const url = `https://news.google.com/rss/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
      const res = await fetch(url);
      const xml = await res.text();
      const parsed = await new Promise((res, rej) => {
        xml2js.parseString(xml, { explicitArray: true }, (err, result) =>
          err ? rej(err) : res(result)
        );
      });
      const items = parsed.rss.channel[0].item || [];
      setArticles(
        items.map((it) => ({
          id: it.guid[0]._,
          title: it.title[0],
          link: it.link[0],
          source: it.source?.[0]._ || "",
          pubDate: it.pubDate[0],
          description: it.description?.[0] || "",
        }))
      );
    } catch (err) {
      console.error("Failed to fetch RSS:", err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [query, whenRange, afterDate, beforeDate, hl, gl, ceid]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const onRefresh = () => fetchNews();

  const renderItem = ({ item }) => {
    const snippet = item.description
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();

    return (
      <TouchableOpacity
        className="px-4 py-5 border-b border-gray-700"
        onPress={() =>
          router.push({
            pathname: "/search/[query]",
            params: {
              url: encodeURIComponent(item.link),
              title: encodeURIComponent(item.title),
            },
          })
        }
      >
        <Text className="text-lg font-semibold text-white mb-1">
          {item.title}
        </Text>
        <Text className="text-xs text-gray-400 mb-2">
          {item.source} • {new Date(item.pubDate).toLocaleString()}
        </Text>
        {snippet && (
          <Text className="text-sm text-gray-200" numberOfLines={3}>
            {snippet}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <View className="px-4 my-6">
        {/* Search bar */}
        <Text className="text-3xl text-white font-psemibold py-3">
          Search News
        </Text>
        <View className="flex flex-row items-center space-x-4 w-full h-16 px-4 bg-black-100 rounded-2xl border-2 border-black-200">
          <TextInput
            className="text-base text-white flex-1 font-pregular"
            placeholder="E.g. Bitcoin, Technology..."
            placeholderTextColor="#CDCDE0"
            value={query}
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

        {/* Toggle advanced */}
        <TouchableOpacity
          className="mt-2"
          onPress={() => setShowAdvanced((v) => !v)}
        >
          <Text className="text-sm text-white underline">
            {showAdvanced ? "Hide Advanced" : "Show Advanced Search"}
          </Text>
        </TouchableOpacity>

        {/* Advanced panel */}
        {showAdvanced && (
          <View className="mt-4 space-y-3">
            {/* relative “when:” */}
            <View className="h-12 px-4 bg-black-100 rounded-2xl border-2 border-black-200 justify-center">
              <Picker
                selectedValue={whenRange}
                onValueChange={(val) => {
                  setWhenRange(val);
                  setAfterDate(null);
                  setBeforeDate(null);
                }}
                style={{ color: "#CDCDE0", backgroundColor: "transparent" }}
                itemStyle={{ color: "#FFF" }}
                dropdownIconColor="#CDCDE0"
              >
                <Picker.Item label="— Use relative time —" value="" />
                {WHEN_OPTIONS.map((o) => (
                  <Picker.Item key={o.value} {...o} />
                ))}
              </Picker>
            </View>

            {/* calendar “after/before:” */}
            {!whenRange && (
              <View className="space-y-3">
                <TouchableOpacity
                  className="h-12 px-4 bg-black-100 rounded-2xl border-2 border-black-200 justify-center"
                  onPress={() => setShowAfterPicker(true)}
                >
                  <Text className="text-base text-white">
                    After:{" "}
                    {afterDate
                      ? afterDate.toISOString().slice(0, 10)
                      : "YYYY-MM-DD"}
                  </Text>
                </TouchableOpacity>
                {showAfterPicker && (
                  <DateTimePicker
                    value={afterDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(_, d) => {
                      setShowAfterPicker(false);
                      if (d) {
                        setAfterDate(d);
                        setWhenRange("");
                      }
                    }}
                  />
                )}

                <TouchableOpacity
                  className="h-12 px-4 bg-black-100 rounded-2xl border-2 border-black-200 justify-center"
                  onPress={() => setShowBeforePicker(true)}
                >
                  <Text className="text-base text-white">
                    Before:{" "}
                    {beforeDate
                      ? beforeDate.toISOString().slice(0, 10)
                      : "YYYY-MM-DD"}
                  </Text>
                </TouchableOpacity>
                {showBeforePicker && (
                  <DateTimePicker
                    value={beforeDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(_, d) => {
                      setShowBeforePicker(false);
                      if (d) {
                        setBeforeDate(d);
                        setWhenRange("");
                      }
                    }}
                  />
                )}
              </View>
            )}

            {/* language */}
            <View className="h-12 px-4 bg-black-100 rounded-2xl border-2 border-black-200 justify-center">
              <Picker
                selectedValue={hl}
                onValueChange={setHl}
                style={{ color: "#CDCDE0", backgroundColor: "transparent" }}
                itemStyle={{ color: "#FFF" }}
                dropdownIconColor="#CDCDE0"
              >
                {HL_OPTIONS.map((opt) => (
                  <Picker.Item key={opt.value} {...opt} />
                ))}
              </Picker>
            </View>

            {/* region */}
            <View className="h-12 px-4 bg-black-100 rounded-2xl border-2 border-black-200 justify-center">
              <Picker
                selectedValue={gl}
                onValueChange={setGl}
                style={{ color: "#CDCDE0", backgroundColor: "transparent" }}
                itemStyle={{ color: "#FFF" }}
                dropdownIconColor="#CDCDE0"
              >
                {GL_OPTIONS.map((opt) => (
                  <Picker.Item key={opt.value} {...opt} />
                ))}
              </Picker>
            </View>

            {/* apply / clear */}
            <View className="flex-row space-x-4 mt-4">
              <TouchableOpacity
                className="flex-1 h-12 bg-blue-600 rounded-2xl items-center justify-center"
                onPress={() => {
                  fetchNews();
                  setShowAdvanced(false);
                }}
              >
                <Text className="text-white font-psemibold">Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 h-12 bg-gray-700 rounded-2xl items-center justify-center"
                onPress={() => {
                  setWhenRange("");
                  setAfterDate(null);
                  setBeforeDate(null);
                  setHl("en");
                  setGl("IN");
                  fetchNews();
                  setShowAdvanced(false);
                }}
              >
                <Text className="text-white font-psemibold">Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Results list */}
      <FlatList
        data={articles}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        ListFooterComponent={
          loading && articles.length > 0 ? (
            <View className="py-4">
              <ActivityIndicator />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title={loading ? "Loading…" : "No Results Found"}
            subtitle={
              loading ? "" : `We couldn’t find anything for “${query.trim()}”`
            }
          />
        }
      />
    </SafeAreaView>
  );
}
