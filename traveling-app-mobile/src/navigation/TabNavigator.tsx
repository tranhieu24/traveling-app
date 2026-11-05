import { useUiPreferences, uiStyle, uiText, uiColor } from '../preferences/ui';
import React from 'react';
import { View } from 'react-native';
import { ChatBubble } from '../components/ai/ChatBubble';
import { useIsFocused } from '@react-navigation/native';
import { useUnreadNotifications } from '../hooks/useNotifications';
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
  useUiPreferences();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { data: unreadCount } = useUnreadNotifications(focused);
  return (
    <View style={uiStyle({ flex: 1 })}>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00BCD4',
        tabBarInactiveTintColor: '#808892',
        tabBarStyle: uiStyle({
          height: 68 + insets.bottom,
          paddingBottom: 4 + insets.bottom,
          paddingTop: 4,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E8EB',
          elevation: 0,
        }),
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
          tabBarLabel: uiText("Tìm kiếm"),
          tabBarIcon: ({ color }) => <Search size={22} color={uiColor(color)} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{
          tabBarLabel: uiText("Yêu thích"),
          tabBarIcon: ({ color }) => <Heart size={22} color={uiColor(color)} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={BookingsScreen}
        options={{
          tabBarLabel: uiText("Đặt phòng"),
          tabBarIcon: ({ color }) => <LayoutGrid size={21} color={uiColor(color)} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxScreen}
        options={{
          tabBarLabel: uiText("Hộp thư"),
          tabBarBadge: unreadCount ? unreadCount > 99 ? '99+' : unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#F06471', color: '#FFFFFF', fontSize: 10 },
          tabBarIcon: ({ color }) => <MessageSquare size={22} color={uiColor(color)} strokeWidth={1.8} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: uiText("Tài khoản"),
          tabBarIcon: ({ color }) => <ContactRound size={22} color={uiColor(color)} strokeWidth={1.8} />,
        }}
      />
    </Tab.Navigator>
    <ChatBubble />
    </View>
  );
};
