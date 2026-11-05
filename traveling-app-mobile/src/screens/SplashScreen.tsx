import { useUiPreferences, uiStyle, uiText } from '../preferences/ui';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

export const SplashScreen: React.FC = () => {
  useUiPreferences();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  useEffect(() => {
    navigation.replace('MainTabs', { screen: 'SearchTab' });
  }, [navigation]);

  return (
    <View style={uiStyle(styles.container)}>
      <View style={uiStyle(styles.logo)} accessible accessibilityRole="image" accessibilityLabel={uiText("Traveling")}>
        <View style={uiStyle(styles.logoStem)} />
        <View style={uiStyle(styles.logoDots)}>
          <View style={uiStyle([styles.logoDot, styles.purpleDot])} />
          <View style={uiStyle([styles.logoDot, styles.blueDot])} />
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
