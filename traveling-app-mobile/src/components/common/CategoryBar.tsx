import React from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { Waves, Mountain, Tent, Trees, Building2, Compass } from 'lucide-react-native';
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
  const getCategoryIcon = (slug: string, isSelected: boolean) => {
    const color = isSelected ? '#00BCD4' : '#717171';
    const size = 22;

    switch (slug) {
      case 'beach':
        return <Waves size={size} color={color} />;
      case 'mountain':
        return <Mountain size={size} color={color} />;
      case 'camping':
        return <Tent size={size} color={color} />;
      case 'countryside':
        return <Trees size={size} color={color} />;
      case 'iconic-cities':
        return <Building2 size={size} color={color} />;
      default:
        return <Compass size={size} color={color} />;
    }
  };

  return (
    <View className="bg-white border-b border-dark-border py-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {/* All Categories Option */}
        <TouchableOpacity
          onPress={() => onSelectCategory(null)}
          className={`items-center mr-6 pb-1.5 border-b-2 ${
            selectedCategoryId === null ? 'border-primary' : 'border-transparent'
          }`}
          activeOpacity={0.7}
        >
          <Compass size={22} color={selectedCategoryId === null ? '#00BCD4' : '#717171'} />
          <Text
            className={`text-xs mt-1 font-medium ${
              selectedCategoryId === null ? 'text-primary font-bold' : 'text-dark-muted'
            }`}
          >
            All Homes
          </Text>
        </TouchableOpacity>

        {/* Dynamic Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(isSelected ? null : cat.id)}
              className={`items-center mr-6 pb-1.5 border-b-2 ${
                isSelected ? 'border-primary' : 'border-transparent'
              }`}
              activeOpacity={0.7}
            >
              {getCategoryIcon(cat.slug, isSelected)}
              <Text
                className={`text-xs mt-1 font-medium ${
                  isSelected ? 'text-primary font-bold' : 'text-dark-muted'
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
