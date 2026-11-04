import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Text, View, Image, useWindowDimensions } from 'react-native';
import { Mountain, Tent, Trees, Building2, Compass, Home, Flame, Sun, Palmtree, Waves } from 'lucide-react-native';
import { Category } from '../../types';
import { categoryImage } from '../../utils/categoryImage';

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

const ICONS = {
  beach: Palmtree, 'palm-tree': Palmtree, mountain: Mountain, caves: Mountain,
  camping: Tent, tent: Tent, countryside: Trees, farms: Trees, lake: Waves,
  'iconic-cities': Building2, city: Building2, trending: Flame,
  tropical: Palmtree, desert: Sun, home: Home, homestay: Home,
};

const CATEGORY_LABELS: Record<string, string> = {
  beach: 'Bãi biển',
  mountain: 'Núi non',
  camping: 'Cắm trại',
  homestay: 'Homestay',
};

export const CategoryBar: React.FC<CategoryBarProps> = ({ categories, selectedCategoryId, onSelectCategory }) => {
  const { width } = useWindowDimensions();
  const priority = ['beach', 'mountain', 'camping', 'homestay'];
  const orderedCategories = [...categories].sort((first, second) => {
    const firstIndex = priority.indexOf(first.slug);
    const secondIndex = priority.indexOf(second.slug);
    return (firstIndex < 0 ? priority.length : firstIndex) - (secondIndex < 0 ? priority.length : secondIndex);
  });
  const categoryWidth = Math.max(84, (width - 40) / 4);
  const isAllActive = selectedCategoryId === null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        <TouchableOpacity
          key="all"
          accessibilityRole="tab"
          accessibilityState={{ selected: isAllActive }}
          accessibilityLabel="Tất cả chỗ ở"
          accessibilityHint="Hiển thị tất cả chỗ ở"
          onPress={() => onSelectCategory(null)}
          activeOpacity={0.7}
          style={[styles.category, { width: categoryWidth }, isAllActive && styles.activeCategory]}
        >
          <Compass size={23} color={isAllActive ? '#00BCD4' : '#808892'} strokeWidth={1.9} />
          <Text numberOfLines={1} style={[styles.label, { color: isAllActive ? '#00BCD4' : '#808892' }, isAllActive && styles.activeLabel]}>
            Tất cả
          </Text>
        </TouchableOpacity>
        {orderedCategories.map((category) => {
          const active = selectedCategoryId === category.id;
          const Icon = ICONS[(category.slug || category.icon) as keyof typeof ICONS] || Compass;
          const color = active ? '#00BCD4' : '#808892';
          const image = categoryImage(category.icon);
          const displayName = CATEGORY_LABELS[category.slug] || category.name;
          return (
            <TouchableOpacity
              key={category.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={displayName}
              accessibilityHint={active ? 'Chạm lại để hiển thị tất cả chỗ ở' : `Hiển thị chỗ ở thuộc ${displayName.toLowerCase()}`}
              onPress={() => onSelectCategory(active ? null : category.id)}
              activeOpacity={0.7}
              style={[styles.category, { width: categoryWidth }, active && styles.activeCategory]}
            >
              {image ? <Image source={{ uri: image }} style={{ width: 23, height: 23, borderRadius: 4 }} /> : <Icon size={23} color={color} strokeWidth={1.9} />}
              <Text numberOfLines={1} style={[styles.label, { color }, active && styles.activeLabel]}>{displayName}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { minHeight: 54, backgroundColor: '#ECFCFE' },
  categories: { paddingHorizontal: 20, alignItems: 'center' },
  category: { minHeight: 54, alignItems: 'center', justifyContent: 'center', paddingTop: 6, paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 3 },
  activeCategory: { borderBottomColor: '#00BCD4' },
  label: { fontSize: 11, lineHeight: 15 },
  activeLabel: { fontWeight: '600' },
});
