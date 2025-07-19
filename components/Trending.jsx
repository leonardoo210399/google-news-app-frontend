// Trending.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import ArticleCard from './ArticleCard';
import Paginations from './Paginations';
import BreakingNewsCard from './BreakingNewsCard';

const SPACING = 0;
const CARD_WIDTH_FACTOR = 0.7;

const zoomIn = { 0: { scale: 0.9 }, 1: { scale: 1 } };
const zoomOut = { 0: { scale: 1 }, 1: { scale: 0.9 } };

const TrendingItem = ({ item, isActive, cardWidth }) => (
  <Animatable.View
    style={[styles.cardContainer, { width: cardWidth }]}
    animation={isActive ? zoomIn : zoomOut}
    duration={500}
  >
    <BreakingNewsCard item={item} />
  </Animatable.View>
);

const Trending = ({ posts = [] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const { width } = useWindowDimensions();

  const CARD_WIDTH = width * CARD_WIDTH_FACTOR;
  const flatListRef = useRef(null);

  // autoplay every 3s
  useEffect(() => {
    const id = setInterval(() => {
      const next = activeIndex + 1 >= posts.length ? 0 : activeIndex + 1;
      flatListRef.current?.scrollToOffset({
        offset: next * (CARD_WIDTH + SPACING),
        animated: true,
      });
      setActiveIndex(next);
    }, 3000);
    return () => clearInterval(id);
  }, [activeIndex, posts.length, CARD_WIDTH]);

  // track which item is visible for pagination & zoom
  const viewConfig = { itemVisiblePercentThreshold: 50 };
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View className="-mx-4 mb-10">
      {/* <Text style={styles.title}>Trending</Text> */}
      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item, index) => `${item.$id}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + SPACING}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: (width - CARD_WIDTH) / 2,
        }}
        onScrollBeginDrag={() => clearInterval()}   // stop auto on drag if you like
        onScrollEndDrag={() => {}}                  // resume auto if you like
        viewabilityConfig={viewConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item, index }) => (
          <TrendingItem
            item={item}
            cardWidth={CARD_WIDTH}
            isActive={index === activeIndex}
          />
        )}
      />
      <Paginations items={posts} paginationsIndex={activeIndex} />
    </View>
  );
};

export default Trending;

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
    marginLeft: 20,
  },
  cardContainer: {
    marginRight: SPACING,
    height: 300,
    borderRadius: 33,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
});
