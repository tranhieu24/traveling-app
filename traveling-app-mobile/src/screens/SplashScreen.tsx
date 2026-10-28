import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token, isLoading } = useAuth();
  const [isSplashReady, setIsSplashReady] = useState(false);

  useEffect(() => {
    let isActive = true;
    let navigationTimeout: ReturnType<typeof setTimeout> | undefined;

    const initializeApp = async () => {
      try {
        // Ping ngầm /health để đánh thức Render cold start nếu có
        await apiClient.get('/health', { timeout: 4000 }).catch(() => { });
      } finally {
        if (!isActive) return;

        navigationTimeout = setTimeout(() => {
          setIsSplashReady(true);
        }, 1200);
      }
    };

    initializeApp();

    return () => {
      isActive = false;
      if (navigationTimeout) clearTimeout(navigationTimeout);
    };
  }, []);

  useEffect(() => {
    if (isSplashReady && !isLoading) {
      navigation.replace(token ? 'MainTabs' : 'CreateAccount');
    }
  }, [isSplashReady, isLoading, token, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logo} accessible accessibilityRole="image" accessibilityLabel="Traveling">
        <View style={styles.logoStem} />
        <View style={styles.logoDots}>
          <View style={[styles.logoDot, styles.purpleDot]} />
          <View style={[styles.logoDot, styles.blueDot]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 58,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logoStem: {
    width: 23,
    height: 60,
    backgroundColor: '#06B6CF',
    borderTopLeftRadius: 23,
    borderBottomRightRadius: 23,
  },
  logoDots: {
    justifyContent: 'space-between',
  },
  logoDot: {
    width: 27,
    height: 27,
    borderRadius: 14,
  },
  purpleDot: {
    backgroundColor: '#8750DF',
  },
  blueDot: {
    backgroundColor: '#4069E5',
  },
});
