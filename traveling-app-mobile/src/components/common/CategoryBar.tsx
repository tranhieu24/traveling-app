import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, Text, View, useWindowDimensions } from 'react-native';
import { Mountain, Tent, Trees, Building2, Compass, Home, Flame, Sun, Palmtree, Waves } from 'lucide-react-native';
import { Category } from '../../types';

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

const ICONS = {
  beach: Palmtree, 'palm-tree': Palmtree, mountain: Mountain, caves: Mountain,
  camping: Tent, tent: Tent, countryside: Trees, farms: Trees, lake: Waves,
  'iconic-cities': Building2, city: Building2, trending: Flame,
  tropical: Palmtree, desert: Sun, home: Home,
};

export const CategoryBar: React.FC<CategoryBarProps> = ({ categories, selectedCategoryId, onSelectCategory }) => {
  const { width } = useWindowDimensions();
  const priority = ['beach', 'mountain', 'camping'];
  const orderedCategories = [...categories].sort((first, second) => {
    const firstIndex = priority.indexOf(first.slug);
    const secondIndex = priority.indexOf(second.slug);
    return (firstIndex < 0 ? priority.length : firstIndex) - (secondIndex < 0 ? priority.length : secondIndex);
  });
  const categoryWidth = Math.max(88, (width - 40) / 3);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {orderedCategories.map((category) => {
          const active = selectedCategoryId === category.id;
          const Icon = ICONS[(category.slug || category.icon) as keyof typeof ICONS] || Compass;
          const color = active ? '#00BCD4' : '#808892';
          return (
            <TouchableOpacity
              key={category.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={category.name}
              accessibilityHint={active ? 'Tap again to show all stays' : `Show ${category.name.toLowerCase()} stays`}
              onPress={() => onSelectCategory(active ? null : category.id)}
              activeOpacity={0.7}
              style={[styles.category, { width: categoryWidth }, active && styles.activeCategory]}
            >
              <Icon size={23} color={color} strokeWidth={1.9} />
              <Text numberOfLines={1} style={[styles.label, { color }, active && styles.activeLabel]}>{category.name}</Text>
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
