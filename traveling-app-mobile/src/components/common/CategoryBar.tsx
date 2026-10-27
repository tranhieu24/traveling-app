import React from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import {
  Waves,
  Mountain,
  Tent,
  Trees,
  Building2,
  Compass,
  Home,
  Flame,
  Sun,
  Palmtree,
} from 'lucide-react-native';
import { Category } from '../../types';

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const getCategoryIcon = (slug?: string, iconName?: string, isActive?: boolean) => {
    const color = isActive ? '#00BCD4' : '#717171';
    const size = 24;

    const key = (slug || iconName || '').toLowerCase();
    switch (key) {
      case 'beach':
      case 'lake':
        return <Waves size={size} color={color} />;
      case 'mountain':
      case 'caves':
        return <Mountain size={size} color={color} />;
      case 'camping':
        return <Tent size={size} color={color} />;
      case 'countryside':
      case 'farms':
        return <Trees size={size} color={color} />;
      case 'iconic-cities':
      case 'city':
        return <Building2 size={size} color={color} />;
      case 'trending':
        return <Flame size={size} color={color} />;
      case 'tropical':
        return <Palmtree size={size} color={color} />;
      case 'desert':
        return <Sun size={size} color={color} />;
      case 'home':
        return <Home size={size} color={color} />;
      default:
        return <Compass size={size} color={color} />;
    }
  };

  return (
    <View className="bg-white border-b border-gray-100 py-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}
        className="flex-row"
      >
        {/* All Homes option */}
        <TouchableOpacity
          onPress={() => onSelectCategory(null)}
          className={`mr-6 items-center pb-2 border-b-2 ${
            selectedCategoryId === null ? 'border-[#00BCD4]' : 'border-transparent'
          }`}
          activeOpacity={0.7}
        >
          <Home
            size={24}
            color={selectedCategoryId === null ? '#00BCD4' : '#717171'}
          />
          <Text
            className={`text-xs mt-1 font-medium ${
              selectedCategoryId === null
                ? 'text-[#00BCD4] font-semibold'
                : 'text-gray-500'
            }`}
          >
            All Homes
          </Text>
        </TouchableOpacity>

        {/* Dynamic Categories */}
        {categories?.map((cat) => {
          const isActive = selectedCategoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(isActive ? null : cat.id)}
              className={`mr-6 items-center pb-2 border-b-2 ${
                isActive ? 'border-[#00BCD4]' : 'border-transparent'
              }`}
              activeOpacity={0.7}
            >
              {getCategoryIcon(cat.slug, (cat as any).icon_name || cat.icon, isActive)}
              <Text
                className={`text-xs mt-1 font-medium ${
                  isActive ? 'text-[#00BCD4] font-semibold' : 'text-gray-500'
                }`}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
