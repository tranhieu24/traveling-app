import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Check, Copy, Share2, X } from 'lucide-react-native';
import { Listing } from '../../types';
import { copyWebText, getListingShareContent } from '../../utils/listingShare';

interface ListingShareDialogProps {
  listing: Listing;
  visible: boolean;
  onClose: () => void;
}

export const ListingShareDialog: React.FC<ListingShareDialogProps> = ({ listing, visible, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const content = getListingShareContent(listing);
  const canShare = Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (visible) {
      setCopied(false);
      setError('');
    }
  }, [visible, listing.id]);

  const handleCopy = async () => {
    if (copying) return;
    setCopying(true);
    setError('');
    try {
      await copyWebText(content.url);
      setCopied(true);
    } catch {
      setError('Could not copy automatically. Select and copy the link above.');
    } finally {
      setCopying(false);
    }
  };

  const handleSystemShare = async () => {
    if (sharing) return;
    setSharing(true);
    setError('');
    try {
      await Share.share(content);
    } catch (shareError: unknown) {
      if (!(shareError instanceof Error && shareError.name === 'AbortError')) {
        setError('Sharing is unavailable here. You can copy the link instead.');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close sharing" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.heading}>Share this place</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close sharing" onPress={onClose} style={styles.closeButton}>
              <X size={22} color="#292C30" />
            </Pressable>
          </View>
          <View style={styles.summary}>
            {!!(listing.cover_photo || listing.photos?.[0]?.photo_url) && (
              <Image source={{ uri: listing.cover_photo || listing.photos?.[0]?.photo_url }} style={styles.photo} resizeMode="cover" />
            )}
            <View style={styles.summaryText}>
              <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
              <Text style={styles.location}>{listing.city}, {listing.country}</Text>
            </View>
          </View>
          <View style={styles.linkBox}>
            <Text selectable accessibilityLabel="Listing link" style={styles.link}>{content.url}</Text>
          </View>
          {Platform.OS === 'web' && (
            <Pressable
              cssInterop={false}
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Link copied' : 'Copy link'}
              disabled={copying}
              onPress={handleCopy}
              style={({ pressed }) => [styles.copyButton, (pressed || copying) && styles.pressed]}
            >
              {copying ? <ActivityIndicator size="small" color="#FFFFFF" /> : copied ? <Check size={19} color="#FFFFFF" /> : <Copy size={19} color="#FFFFFF" />}
              <Text style={styles.copyText}>{copied ? 'Link copied!' : 'Copy link'}</Text>
            </Pressable>
          )}
          {canShare && (
            <Pressable accessibilityRole="button" disabled={sharing} onPress={handleSystemShare} style={styles.shareButton}>
              <Share2 size={18} color="#00A6BC" />
              <Text style={styles.shareText}>{sharing ? 'Opening sharing...' : 'More sharing options'}</Text>
            </Pressable>
          )}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {copied && <Text accessibilityRole="alert" style={styles.success}>The link is ready to paste into a message.</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 420, borderRadius: 16, padding: 22, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  heading: { flex: 1, fontSize: 21, lineHeight: 28, fontWeight: '700', color: '#232629' },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  photo: { width: 70, height: 70, borderRadius: 10, backgroundColor: '#F0F2F3' },
  summaryText: { flex: 1 },
  title: { color: '#292C30', fontSize: 16, fontWeight: '600', lineHeight: 23 },
  location: { color: '#797C81', fontSize: 14, lineHeight: 21, marginTop: 4 },
  linkBox: { padding: 13, borderRadius: 6, borderWidth: 1, borderColor: '#E1E5E8', backgroundColor: '#F7F9FA', marginBottom: 16 },
  link: { color: '#646970', fontSize: 13, lineHeight: 20 },
  copyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 50, padding: 12, borderRadius: 6, backgroundColor: '#00BCD4' },
  copyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  shareButton: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 8 },
  shareText: { color: '#00A6BC', fontSize: 15 },
  error: { color: '#C93D48', fontSize: 13, lineHeight: 20, marginTop: 12 },
  success: { color: '#36816A', fontSize: 13, lineHeight: 20, marginTop: 12 },
  pressed: { opacity: 0.65 },
});
