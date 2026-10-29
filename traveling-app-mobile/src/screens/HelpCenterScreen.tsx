import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ArrowUpRight, CalendarCheck, ChevronDown, ChevronRight, HelpCircle, Search, Settings, X } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { findHelpArticles, HELP_CATEGORIES, HelpAction, HelpCategory } from '../data/helpArticles';

export const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<HelpCategory | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const articles = findHelpArticles(query, category);

  const openAction = (action: HelpAction) => {
    if ((action === 'bookings' || action === 'favorites') && !user) {
      navigation.navigate('Login');
      return;
    }
    if (action === 'settings') navigation.navigate('Settings');
    else navigation.navigate('MainTabs', { screen: action === 'bookings' ? 'BookingsTab' : action === 'favorites' ? 'FavoritesTab' : 'SearchTab' });
  };

  const resetSearch = () => {
    setQuery('');
    setCategory('all');
    setExpandedId(null);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to profile" style={styles.backButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('MainTabs', { screen: 'ProfileTab' })}>
          <ArrowLeft size={22} color="#292C30" />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Help Center</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><HelpCircle size={28} color="#008C9E" /></View>
          <Text accessibilityRole="header" style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroDescription}>Find answers and get back to planning your next stay.</Text>
          <View style={styles.searchField}>
            <Search size={20} color="#6B7280" />
            <TextInput
              accessibilityLabel="Search help articles"
              placeholder="Search bookings, payments, account..." placeholderTextColor="#9CA3AF"
              value={query} onChangeText={(value) => { setQuery(value); setExpandedId(null); }}
              autoCapitalize="none" autoCorrect={false} style={styles.searchInput}
            />
            {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear help search" onPress={() => setQuery('')} style={styles.clearButton}><X size={18} color="#6B7280" /></Pressable>}
          </View>
        </View>

        <View style={styles.quickActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Help with my bookings" style={styles.quickCard} onPress={() => openAction('bookings')}>
            <CalendarCheck size={23} color="#00A3B8" />
            <Text style={styles.quickTitle}>My bookings</Text>
            <Text style={styles.quickDescription}>{user ? 'Check your reservation status' : 'Log in to view your reservations'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open account settings" style={styles.quickCard} onPress={() => openAction('settings')}>
            <Settings size={23} color="#00A3B8" />
            <Text style={styles.quickTitle}>Account settings</Text>
            <Text style={styles.quickDescription}>Passwords and notification permissions</Text>
          </Pressable>
        </View>

        <Text accessibilityRole="header" style={styles.sectionTitle}>Frequently asked questions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {HELP_CATEGORIES.map((item) => (
            <Pressable
              key={item.id} accessibilityRole="button" accessibilityLabel={`Help topic: ${item.label}`}
              accessibilityState={{ selected: category === item.id }}
              onPress={() => { setCategory(item.id); setExpandedId(null); }}
              style={[styles.category, category === item.id && styles.selectedCategory]}
            >
              <Text style={[styles.categoryLabel, category === item.id && styles.selectedCategoryLabel]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text accessibilityLiveRegion="polite" style={styles.resultCount}>{articles.length} {articles.length === 1 ? 'article' : 'articles'}</Text>

        {articles.length > 0 ? (
          <View style={styles.articleList}>
            {articles.map((article, index) => {
              const expanded = expandedId === article.id;
              const action = article.action;
              return (
                <View key={article.id} style={index > 0 && styles.articleBorder}>
                  <Pressable
                    accessibilityRole="button" accessibilityLabel={article.question}
                    accessibilityState={{ expanded }}
                    onPress={() => setExpandedId(expanded ? null : article.id)} style={styles.questionButton}
                  >
                    <Text style={styles.question}>{article.question}</Text>
                    {expanded ? <ChevronDown size={20} color="#00A3B8" /> : <ChevronRight size={20} color="#9CA3AF" />}
                  </Pressable>
                  {expanded && (
                    <View style={styles.answerBlock}>
                      <Text style={styles.answer}>{article.answer}</Text>
                      {action && <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={() => openAction(action.type)} style={styles.articleAction}><Text style={styles.actionLabel}>{action.label}</Text><ArrowUpRight size={17} color="#008C9E" /></Pressable>}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <Search size={30} color="#00A3B8" />
            <Text style={styles.emptyTitle}>No help articles found</Text>
            <Text style={styles.quickDescription}>Try another keyword or view all topics.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Reset help search" onPress={resetSearch} style={styles.resetButton}><Text style={styles.actionLabel}>View all topics</Text></Pressable>
          </View>
        )}
        <View style={styles.tip}>
          <HelpCircle size={20} color="#008C9E" />
          <Text style={styles.tipText}>For a reservation issue, keep your booking code and the error message handy so you can describe the issue clearly.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFB' },
  header: { minHeight: 66, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#292C30' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 40 },
  hero: { backgroundColor: '#E3FAFD', padding: 22, borderRadius: 20 },
  heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#C5F2F8', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 27, fontWeight: '700', color: '#25353B' },
  heroDescription: { fontSize: 14, lineHeight: 22, color: '#57717A', marginTop: 8, marginBottom: 20 },
  searchField: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 4, borderWidth: 1, borderColor: '#C9E3E7', borderRadius: 12, backgroundColor: '#FFFFFF' },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 13, fontSize: 14, color: '#292C30' },
  clearButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  quickActions: { flexDirection: 'row', gap: 12, marginVertical: 20 },
  quickCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  quickTitle: { fontSize: 15, fontWeight: '600', color: '#292C30', marginTop: 12, marginBottom: 6 },
  quickDescription: { fontSize: 13, lineHeight: 20, color: '#6B7280' },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: '#292C30', marginTop: 4 },
  categories: { gap: 8, paddingVertical: 16 },
  category: { minHeight: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  selectedCategory: { backgroundColor: '#00B8CE', borderColor: '#00B8CE' },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  selectedCategoryLabel: { color: '#FFFFFF' },
  resultCount: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  articleList: { borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', backgroundColor: '#FFFFFF' },
  articleBorder: { borderTopWidth: 1, borderTopColor: '#EEF0F2' },
  questionButton: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18 },
  question: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: '600', color: '#374151' },
  answerBlock: { paddingHorizontal: 18, paddingBottom: 18 },
  answer: { fontSize: 14, lineHeight: 23, color: '#6B7280' },
  articleAction: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginTop: 8 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#008C9E' },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  resetButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, marginTop: 12 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16, marginTop: 20, borderRadius: 14, backgroundColor: '#EAF8FA' },
  tipText: { flex: 1, fontSize: 12, lineHeight: 19, color: '#57717A' },
});
