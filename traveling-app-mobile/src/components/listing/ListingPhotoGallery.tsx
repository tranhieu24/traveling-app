import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, ImageOff, Images, X } from 'lucide-react-native';

export const ListingImage = ({ url, contain = false }: { url?: string; contain?: boolean }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return !url || failed ? (
    <View style={s.missing}>
      <ImageOff size={30} color="#A2AAB5" />
      <Text style={s.missingText}>Photo unavailable</Text>
    </View>
  ) : (
    <Image
      source={{ uri: url }}
      resizeMode={contain ? 'contain' : 'cover'}
      onError={() => setFailed(true)}
      style={s.image}
    />
  );
};
export const ListingHero = ({
  photos,
  onPhotos,
  controls,
}: {
  photos: string[];
  onPhotos: () => void;
  controls: React.ReactNode;
}) => {
  const [width, setWidth] = useState(0),
    [active, setActive] = useState(0);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  return (
    <View
      style={s.hero}
      onLayout={(event) => {
        const value = event.nativeEvent.layout.width;
        setWidth(value);
        scroll.current?.scrollTo({ x: active * value, animated: false });
      }}
    >
      {photos.length ? (
        <ScrollView
          ref={scroll}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            width && setActive(Math.round(event.nativeEvent.contentOffset.x / width))
          }
        >
          {photos.map((url, index) => (
            <Pressable
              key={url}
              accessibilityRole="button"
              accessibilityLabel={`Open room photo ${index + 1}`}
              onPress={onPhotos}
              style={{ width, height: '100%' }}
            >
              <ListingImage url={url} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <ListingImage />
      )}
      {controls}
      {photos.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Show all ${photos.length} photos`}
          onPress={onPhotos}
          style={s.photoCount}
        >
          <Images size={16} color="white" />
          <Text style={s.count}>{photos.length}</Text>
        </Pressable>
      )}
    </View>
  );
};
export const ListingPhotoGallery = ({
  photos,
  visible,
  onClose,
}: {
  photos: string[];
  visible: boolean;
  onClose: () => void;
}) => {
  const [width, setWidth] = useState(1),
    [active, setActive] = useState(0);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    if (visible) {
      setActive(0);
      scroll.current?.scrollTo({ x: 0, animated: false });
    }
  }, [visible]);
  const move = (delta: number) => {
    const next = Math.max(0, Math.min(photos.length - 1, active + delta));
    setActive(next);
    scroll.current?.scrollTo({ x: next * width, animated: true });
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.gallery} edges={['top', 'bottom']}>
        <View style={s.galleryHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close photos"
            onPress={onClose}
            style={s.iconButton}
          >
            <X color="white" size={24} />
          </Pressable>
          <Text style={s.galleryTitle}>Photos</Text>
          <View style={s.iconButton} />
        </View>
        <View
          style={{ flex: 1 }}
          onLayout={(event) => {
            const value = event.nativeEvent.layout.width;
            setWidth(value);
            scroll.current?.scrollTo({ x: active * value, animated: false });
          }}
        >
          <ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ height: '100%' }}
            onMomentumScrollEnd={(event) =>
              setActive(Math.round(event.nativeEvent.contentOffset.x / width))
            }
          >
            {photos.map((url, index) => (
              <View
                key={url}
                accessibilityLabel={`Room photo ${index + 1} of ${photos.length}`}
                style={{ width, height: '100%' }}
              >
                <ListingImage url={url} contain />
              </View>
            ))}
          </ScrollView>
        </View>
        <View style={s.galleryFooter}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous room photo"
            disabled={active <= 0}
            onPress={() => move(-1)}
            style={[s.iconButton, active <= 0 && { opacity: 0.3 }]}
          >
            <ChevronLeft size={25} color="white" />
          </Pressable>
          <Text style={s.count}>
            {active + 1} / {photos.length}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next room photo"
            disabled={active >= photos.length - 1}
            onPress={() => move(1)}
            style={[s.iconButton, active >= photos.length - 1 && { opacity: 0.3 }]}
          >
            <ChevronRight size={25} color="white" />
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
const s = StyleSheet.create({
  hero: { width: '100%', aspectRatio: 1.65, backgroundColor: '#F0F2F4' },
  image: { width: '100%', height: '100%' },
  missing: {
    flex: 1,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F5',
    gap: 9,
  },
  missingText: { color: '#A2AAB5', fontSize: 11 },
  photoCount: {
    position: 'absolute',
    right: 18,
    bottom: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(31,36,41,0.62)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: { color: 'white', fontSize: 12 },
  gallery: { flex: 1, backgroundColor: '#121820' },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 64,
  },
  galleryTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  galleryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
});
