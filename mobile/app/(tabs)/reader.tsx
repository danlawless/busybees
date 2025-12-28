/**
 * Reader Screen
 * M2 reader discovery and connection management
 */

import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { ReaderDiscovery } from '@/components/terminal/ReaderDiscovery';

export default function ReaderScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ReaderDiscovery />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});

