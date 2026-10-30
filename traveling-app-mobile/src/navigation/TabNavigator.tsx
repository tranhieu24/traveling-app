import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Search, Heart, LayoutGrid, MessageSquare, ContactRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabParamList } from '../types';
import { HomeScreen } from '../screens/HomeScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { InboxScreen } from '../screens/InboxScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const TabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00BCD4',
        tabBarInactiveTintColor: '#808892',
        tabBarStyle: {
          height: 68 + insets.bottom,
          paddingBottom: 4 + insets.bottom,
          paddingTop: 4,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E8EB',
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          lineHeight: 14,
          flexShrink: 0,
          fontWeight: '500',
          marginTop: 3,
        },
      }}
    >
      <Tab.Screen
        name="SearchTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color }) => <Search size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Favorites',
          tabBarIcon: ({ color }) => <Heart size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color }) => <LayoutGrid size={21} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxScreen}
        options={{
          tabBarLabel: 'Inbox',
          tabBarIcon: ({ color }) => <MessageSquare size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <ContactRound size={22} color={color} strokeWidth={1.8} />,
        }}
      />
    </Tab.Navigator>
  );
};
