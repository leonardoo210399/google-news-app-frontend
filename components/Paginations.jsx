// components/Paginations.jsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

const Paginations = ({ items, paginationsIndex }) => {
  return (
    <View style={styles.container}>
      {items.map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor:
                paginationsIndex === index ? '#FF4C4C' : '#666',
            },
          ]}
        />
      ))}
    </View>
  );
};

export default Paginations;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    marginHorizontal: 2,
    borderRadius: 8,
  },
});
