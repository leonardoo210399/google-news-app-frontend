import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ScrollView,
  Text,
  ActivityIndicator,
  View,
  Image,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { parse } from "fast-html-parser";
import * as Speech from "expo-speech";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
  saveBookmark as addBookmark,
  removeBookmark as deleteBookmark,
  getCurrentUser,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/context/GlobalProvider";

export default function ArticleDetail() {
  const { user, setUser } = useGlobalContext();

  const { payload } = useLocalSearchParams();
  const item = JSON.parse(payload);
  const router = useRouter();

  const [bookmark, setBookmark] = useState(false);
  // Re-run on focus, normalize to ID strings
  useFocusEffect(
    useCallback(() => {
      const bookmarkedIds = Array.isArray(user?.articlesBookmarked)
        ? user.articlesBookmarked.map((el) =>
            typeof el === "string" ? el : el.$id || el.id
          )
        : [];
      setBookmark(bookmarkedIds.includes(item.$id));
    }, [user?.articlesBookmarked, item.$id])
  );

  const toggleBookmark = () => {
    const willBeBookmarked = !bookmark;
    setBookmark(willBeBookmarked);

    if (willBeBookmarked) {
      // fire-and-forget add
      addBookmark(item.$id, user)
        .then((updatedDoc) => {
          // sync global user
          setUser({
            ...user,
            articlesBookmarked: updatedDoc.articlesBookmarked,
          });
        })
        .catch((err) => {
          console.warn("Failed to save bookmark:", err);
          // rollback UI
          setBookmark(false);
        });
    } else {
      // fire-and-forget remove
      deleteBookmark(item.$id, user)
        .then((updatedDoc) => {
          setUser({
            ...user,
            articlesBookmarked: updatedDoc.articlesBookmarked,
          });
        })
        .catch((err) => {
          console.warn("Failed to remove bookmark:", err);
          setBookmark(true);
        });
    }
  };
  // Article & TTS state
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState({
    authorName: "",
    authorAvatar: null,
    publishedAt: null,
    title: "",
    lead: "",
    audioDuration: null,
    views: "",
    coverImage: "",
    content: [],
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsChunks, setTtsChunks] = useState([]);
  const chunkIndexRef = useRef(0);
  const isTtsPausedRef = useRef(false);
  const timerRef = useRef(null);

  // Cleanup on blur/unmount
  useFocusEffect(
    useCallback(
      () => () => {
        Speech.stop();
        if (timerRef.current) clearTimeout(timerRef.current);
      },
      []
    )
  );

  // Helpers
  const estimateDurationMs = (text) => {
    const words = text.trim().split(/\s+/).length;
    return Math.ceil((words / 150) * 60 * 1000);
  };

  const formatMillis = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const chunkText = (text) =>
    text.split(/(?<=[.?!])\s+/).filter((c) => c.length > 0);

  // Fetch & parse article HTML
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(item.titleUrl);
        const html = await res.text();
        await new Promise((r) => setTimeout(r, 500));

        // Extract <article> snippet
        const bodyStart = html.indexOf("<body");
        const bodyOpen = html.indexOf(">", bodyStart);
        const bodyEnd = html.indexOf("</body>");
        const body =
          bodyStart > -1 && bodyEnd > -1
            ? html.substring(bodyOpen + 1, bodyEnd)
            : html;
        const start = body.indexOf('<article id="article-');
        const endTag = "</article>";
        const end = body.indexOf(endTag, start) + endTag.length;
        const snippet =
          start > -1 && end > start ? body.substring(start, end) : body;
        const root = parse(snippet);

        // Metadata
        const authorName =
          root.querySelector(".post-meta__author-name")?.text.trim() || "";
        let authorAvatar = null;
        root.querySelectorAll("img").forEach((img) => {
          if (
            !authorAvatar &&
            img.parentNode?.attributes.class?.includes(
              "post-meta__author-avatar"
            )
          ) {
            authorAvatar = img.attributes.src;
          }
        });
        let publishedAt = null;
        root.querySelectorAll("time").forEach((t) => {
          if (!publishedAt && t.attributes.datetime)
            publishedAt = t.attributes.datetime;
        });
        const title =
          (root.querySelector("h1.post__title")?.text.trim() || "") + ".";
        const lead =
          root.querySelector(".post__block_lead-text p")?.text.trim() || "";
        const coverImage =
          root.querySelector(".post-cover__image img")?.attributes.src || "";
        let views = "";
        root.querySelectorAll("span").forEach((sp) => {
          if (sp.attributes["data-testid"] === "post-views")
            views = sp.text.trim();
        });

        // Content blocks
        const content = [];
        const pcNode = root.querySelector(".post-content");
        pcNode?.childNodes.forEach((node) => {
          if (node.tagName === "p") {
            const txt = node.text.trim();
            if (txt) content.push({ type: "text", text: txt });
          }
          if (node.tagName === "figure") {
            const img = node.querySelector("img");
            const cap = node.querySelector("figcaption");
            content.push({
              type: "image",
              src: img?.attributes.src || "",
              caption: cap?.text.trim() || "",
            });
          }
        });

        // Update article state
        const fullText = [
          title,
          lead,
          ...content.filter((c) => c.type === "text").map((c) => c.text),
        ].join(" ");
        const durationMs = estimateDurationMs(fullText);
        setArticle({
          authorName,
          authorAvatar,
          publishedAt,
          title,
          lead,
          audioDuration: formatMillis(durationMs),
          views,
          coverImage,
          content,
        });

        // Prepare TTS chunks
        setTtsChunks(chunkText(fullText));
        chunkIndexRef.current = 0;
      } catch (e) {
        console.warn("Failed to load article:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [item.titleUrl]);

  // TTS playback
  const speakNextChunk = () => {
    const idx = chunkIndexRef.current;
    if (idx < ttsChunks.length) {
      const text = ttsChunks[idx];
      Speech.speak(text, {
        utteranceId: `chunk-${idx}`,
        onDone: (id) => {
          if (!isTtsPausedRef.current) {
            chunkIndexRef.current += 1;
            speakNextChunk();
          }
        },
        onError: (err) => console.warn("TTS error:", err),
      });
    } else {
      setIsPlaying(false);
    }
  };

  const handleListen = () => {
    if (isPlaying) {
      isTtsPausedRef.current = true;
      Speech.stop();
      setIsPlaying(false);
    } else {
      isTtsPausedRef.current = false;
      setIsPlaying(true);
      speakNextChunk();
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerStyle: { backgroundColor: "#161622" },
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={22} color="#CDCDE0" />
              </TouchableOpacity>
            ),
            
            title: "",
          }}
        />
        <View className="flex-1 justify-center items-center bg-primary">
          <ActivityIndicator size={"large"} color="#FF9C01" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: "#161622" },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#CDCDE0" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={toggleBookmark}>
              <Ionicons
                name={bookmark ? "heart" : "heart-outline"}
                size={22}
                color={bookmark ? "red" : "#CDCDE0"}
              />
            </TouchableOpacity>
          ),
          title: "",
        }}
      />
      <ScrollView className="bg-primary p-4">
        {/* Metadata */}
        <View className="flex-row items-center mb-4">
          {article.authorAvatar && (
            <Image
              source={{ uri: article.authorAvatar }}
              className="w-8 h-8 rounded-full mr-2 border border-secondary-100"
            />
          )}
          <Text className="text-sm font-pmedium text-gray-100">
            {article.authorName}
          </Text>
          {article.publishedAt && (
            <Text className="text-xs font-pregular text-gray-100 ml-2">
              {new Date(article.publishedAt).toLocaleString()}
            </Text>
          )}
        </View>

        {/* Title & lead */}
        <Text className="text-3xl font-psemibold text-secondary mb-2">
          {article.title}
        </Text>
        <Text className="text-base font-pregular text-gray-100 mb-4">
          {article.lead}
        </Text>

        {/* Listen button & views */}
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={handleListen}
            className="bg-secondary px-4 py-2 rounded-full"
          >
            <Text className="text-sm font-pmedium text-black">
              {isPlaying ? "⏸️" : "▶️"} Listen {article.audioDuration}
            </Text>
          </TouchableOpacity>
          {article.views && (
            <Text className="text-sm font-pregular text-gray-100">
              👁️ {article.views}
            </Text>
          )}
        </View>

        {/* Cover image */}
        {article.coverImage && (
          <Image
            source={{ uri: article.coverImage }}
            className="w-full h-60 rounded-lg mb-6"
            resizeMode="cover"
          />
        )}

        {/* Content blocks */}
        {article.content.map((block, idx) =>
          block.type === "text" ? (
            <Text
              key={idx}
              className="text-base font-pregular text-gray-100 mb-3"
            >
              {block.text}
            </Text>
          ) : (
            <View key={idx} className="mb-4">
              {block.src && (
                <Image
                  source={{ uri: block.src }}
                  className="w-full h-48 rounded-lg mb-2"
                  resizeMode="cover"
                />
              )}
              {block.caption && (
                <Text className="text-xs font-pregular text-gray-100 text-center">
                  {block.caption}
                </Text>
              )}
            </View>
          )
        )}
      </ScrollView>
    </>
  );
}
