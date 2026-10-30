import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Star,
} from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  fetchReviewEligibility,
  matchesSubmittedReview,
  OwnReview,
  ReviewAlreadySubmittedError,
  ReviewEligibility,
  reviewErrorMessage,
  ReviewUnconfirmedError,
  submitPropertyReview,
} from '../services/reviewSubmission';
import {
  ReviewDraft,
  reviewFieldErrors,
  ReviewFieldErrors,
  validateReviewDraft,
} from '../utils/reviewSubmission';
import { reviewDate } from '../utils/listingDetail';
import { ReviewStars } from '../components/listing/ReviewCard';

type Phase = 'editing' | 'success' | 'already' | 'uncertain' | 'blocked';
const ratingNames = ['Choose a rating', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
export const WriteReviewScreen: React.FC = () => {
  const {
    params: { listingId, listingTitle },
  } = useRoute<RouteProp<RootStackParamList, 'WriteReview'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, token, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0),
    [comment, setComment] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ReviewFieldErrors>({});
  const [formError, setFormError] = useState(''),
    [statusNote, setStatusNote] = useState('');
  const [phase, setPhase] = useState<Phase>('editing'),
    [record, setRecord] = useState<OwnReview | null>(null);
  const [submitting, setSubmitting] = useState(false),
    [checking, setChecking] = useState(false),
    [forceLogin, setForceLogin] = useState(false);
  const pending = useRef(false),
    pendingDraft = useRef<ReviewDraft | null>(null);
  useEffect(() => {
    setRating(0);
    setComment('');
    setFieldErrors({});
    setFormError('');
    setStatusNote('');
    setPhase('editing');
    setRecord(null);
    pendingDraft.current = null;
  }, [listingId, user?.id]);
  useEffect(() => setForceLogin(false), [user?.id, token]);
  const eligibilityKey = ['review_eligibility', listingId, user?.id];
  const access = useQuery({
    queryKey: eligibilityKey,
    queryFn: ({ signal }) => fetchReviewEligibility(listingId, user!.id, signal),
    enabled: !authLoading && !!user && !forceLogin,
    retry: (count, error) =>
      !(axios.isAxiosError(error) && [401, 403, 404].includes(error.response?.status || 0)) &&
      count < 1,
  });
  const data = access.data;
  const title = data?.listingTitle || listingTitle || 'Your stay';
  const needsLogin =
    !authLoading &&
    (!user ||
      forceLogin ||
      (axios.isAxiosError(access.error) && access.error.response?.status === 401));
  const forbidden =
    axios.isAxiosError(access.error) && [403, 404].includes(access.error.response?.status || 0);
  const existing = record || data?.existingReview;
  const already = phase === 'already' || !!data?.existingReview;
  const blocked = phase === 'blocked' || data?.reason === 'completed_stay_required';
  const busy = submitting || checking;
  const back = () => {
    if (!pending.current)
      navigation.canGoBack()
        ? navigation.goBack()
        : navigation.replace('ListingDetail', { listingId });
  };
  const viewReviews = () => navigation.navigate('AllReviews', { listingId, listingTitle: title });
  const saveConfirmed = (review: OwnReview) => {
    setRecord(review);
    setPhase('success');
    setFormError('');
    setStatusNote('');
    queryClient.setQueryData<ReviewEligibility>(
      eligibilityKey,
      (current: ReviewEligibility | undefined) =>
        current
          ? { ...current, canReview: false, reason: 'already_reviewed', existingReview: review }
          : current
    );
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['listing_reviews', listingId] }),
      queryClient.invalidateQueries({ queryKey: ['listing_detail', listingId] }),
      ...['listings', 'search_results', 'my_favorites'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      ),
    ]);
  };
  const submit = async () => {
    if (pending.current || authLoading || phase !== 'editing') return;
    if (!user) {
      setForceLogin(true);
      return;
    }
    if (!data?.canReview || access.isFetching || access.isError) {
      setFormError('Verify your review access before submitting.');
      return;
    }
    const errors = reviewFieldErrors({ rating, comment });
    setFieldErrors(errors);
    setFormError('');
    setStatusNote('');
    if (Object.keys(errors).length) return;
    const draft = validateReviewDraft({ rating, comment });
    pendingDraft.current = draft;
    pending.current = true;
    setSubmitting(true);
    try {
      saveConfirmed(await submitPropertyReview(listingId, user.id, draft));
    } catch (error) {
      if (error instanceof ReviewAlreadySubmittedError) {
        setRecord(error.review);
        setPhase('already');
        void access.refetch();
      } else if (error instanceof ReviewUnconfirmedError) {
        setPhase('uncertain');
        setFormError(error.message);
      } else if (axios.isAxiosError(error) && error.response?.status === 401) setForceLogin(true);
      else if (
        axios.isAxiosError(error) &&
        error.response?.status === 403 &&
        error.response?.data?.error?.code === 'REVIEW_NOT_ELIGIBLE'
      ) {
        setPhase('blocked');
        void access.refetch();
      } else setFormError(reviewErrorMessage(error));
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };
  const checkSubmission = async () => {
    if (!user || pending.current) return;
    pending.current = true;
    setChecking(true);
    setFormError('');
    try {
      const current = await fetchReviewEligibility(listingId, user.id);
      queryClient.setQueryData(eligibilityKey, current);
      if (current.existingReview) {
        if (
          pendingDraft.current &&
          matchesSubmittedReview(current.existingReview, pendingDraft.current)
        )
          saveConfirmed(current.existingReview);
        else {
          setRecord(current.existingReview);
          setPhase('already');
        }
      } else {
        setPhase(current.canReview ? 'editing' : 'blocked');
        setStatusNote(
          current.canReview ? 'No review is currently recorded. Your draft is ready to submit.' : ''
        );
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) setForceLogin(true);
      else setFormError(reviewErrorMessage(error));
    } finally {
      pending.current = false;
      setChecking(false);
    }
  };
  const refresh = async () => {
    if (pending.current) return;
    const result = await access.refetch();
    if (result.data?.canReview && phase !== 'success') {
      setPhase('editing');
      setRecord(null);
      setFormError('');
    }
  };
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={s.screen}>
      <View style={s.frame}>
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back from writing review"
            disabled={busy}
            onPress={back}
            style={s.back}
          >
            <ChevronLeft size={23} color="#687483" />
          </Pressable>
          <Text accessibilityRole="header" style={s.headerTitle}>
            Write a Review
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh review access"
            disabled={!user || authLoading || busy || access.isFetching}
            onPress={() => void refresh()}
            style={s.back}
          >
            <RefreshCw size={17} color="#9CA7B4" />
          </Pressable>
        </View>
        {authLoading || (!!user && access.isLoading) ? (
          <View style={s.center}>
            <ActivityIndicator color="#00B8CE" />
            <Text style={s.stateCopy}>Checking your stay...</Text>
          </View>
        ) : needsLogin ? (
          <View style={s.center}>
            <View style={s.stateIcon}>
              <LockKeyhole size={29} color="#00A9BE" />
            </View>
            <Text style={s.stateTitle}>Log in to write a review</Text>
            <Text style={s.stateCopy}>
              Your account and completed stay are required to share a review.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log in to write review"
              onPress={() => navigation.navigate('Login')}
              style={s.primary}
            >
              <Text style={s.primaryText}>Log in</Text>
            </Pressable>
          </View>
        ) : !data || forbidden ? (
          <View style={s.center}>
            <Text style={s.stateTitle}>Unable to verify your stay</Text>
            <Text style={s.stateCopy}>Please check your connection and try again.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry review eligibility"
              onPress={() => void refresh()}
              style={s.primary}
            >
              <Text style={s.primaryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.content}
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.propertyTitle}>{title}</Text>
              {phase === 'success' || already ? (
                <View style={s.outcome}>
                  <View style={s.stateIcon}>
                    <CheckCircle2 size={31} color="#00A8BD" />
                  </View>
                  <Text accessibilityRole="header" style={s.stateTitle}>
                    {phase === 'success'
                      ? 'Review submitted!'
                      : 'You have already reviewed this stay'}
                  </Text>
                  <Text style={s.stateCopy}>
                    {phase === 'success'
                      ? 'Thank you for sharing your experience. Your review has been saved.'
                      : 'Your account has a review for this property. You can read it below or view all guest reviews.'}
                  </Text>
                  {existing && (
                    <View style={s.savedReview}>
                      <View style={s.savedHeading}>
                        <ReviewStars rating={existing.rating} size={18} />
                        <Text style={s.savedDate}>{reviewDate(existing.created_at)}</Text>
                      </View>
                      <Text selectable style={s.savedComment}>
                        {existing.comment}
                      </Text>
                    </View>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View reviews after submission"
                    onPress={viewReviews}
                    style={s.primary}
                  >
                    <Text style={s.primaryText}>View reviews</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back to reviewed property"
                    onPress={() => navigation.navigate('ListingDetail', { listingId })}
                    style={s.secondary}
                  >
                    <Text style={s.secondaryText}>Back to property</Text>
                  </Pressable>
                </View>
              ) : blocked ? (
                <View style={s.outcome}>
                  <View style={s.stateIcon}>
                    <CalendarCheck size={31} color="#00A8BD" />
                  </View>
                  <Text style={s.stateTitle}>Reviews open after your stay</Text>
                  <Text style={s.stateCopy}>
                    You can review this property once your booking is marked Completed. Check your
                    bookings to see the current status.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View bookings for review access"
                    onPress={() => navigation.navigate('MainTabs', { screen: 'BookingsTab' })}
                    style={s.primary}
                  >
                    <Text style={s.primaryText}>View bookings</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={s.subtitle}>How was your stay? Rate your overall experience.</Text>
                  <View style={s.verified}>
                    <ShieldCheck size={13} color="#00A6BA" />
                    <Text style={s.verifiedText}>Completed stay</Text>
                  </View>
                  <View style={s.ratingBox}>
                    <View
                      accessibilityRole="radiogroup"
                      accessibilityLabel="Overall stay rating"
                      style={s.ratingRow}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Pressable
                          key={star}
                          accessibilityRole="radio"
                          accessibilityLabel={`Rate ${star} ${star === 1 ? 'star' : 'stars'}`}
                          accessibilityState={{
                            checked: rating === star,
                            disabled: busy || phase === 'uncertain',
                          }}
                          aria-checked={rating === star}
                          disabled={busy || phase === 'uncertain'}
                          onPress={() => {
                            setRating(star);
                            setFieldErrors((value) => ({ ...value, rating: undefined }));
                            setFormError('');
                          }}
                          style={s.starButton}
                        >
                          <Star
                            size={33}
                            strokeWidth={1.5}
                            color={star <= rating ? '#F4AA14' : '#CDD4DD'}
                            fill={star <= rating ? '#F4AA14' : 'transparent'}
                          />
                        </Pressable>
                      ))}
                    </View>
                    <Text accessibilityLiveRegion="polite" style={s.ratingLabel}>
                      {ratingNames[rating]}
                    </Text>
                  </View>
                  {!!fieldErrors.rating && (
                    <Text accessibilityRole="alert" style={s.error}>
                      {fieldErrors.rating}
                    </Text>
                  )}
                  <Text style={s.feedbackLabel}>YOUR FEEDBACK</Text>
                  <TextInput
                    accessibilityLabel="Your review feedback"
                    value={comment}
                    editable={!busy && phase !== 'uncertain'}
                    onChangeText={(value) => {
                      setComment(value);
                      setFieldErrors((current) => ({ ...current, comment: undefined }));
                      setFormError('');
                      setStatusNote('');
                    }}
                    maxLength={1000}
                    multiline
                    textAlignVertical="top"
                    placeholder="Share your experience, what you loved most, and tips for future guests..."
                    placeholderTextColor="#9DA7B3"
                    style={[s.input, !!fieldErrors.comment && s.invalidInput]}
                  />
                  <View style={s.inputHints}>
                    <Text style={s.hint}>Minimum 5 characters</Text>
                    <Text style={s.hint}>{comment.length}/1000</Text>
                  </View>
                  {!!fieldErrors.comment && (
                    <Text accessibilityRole="alert" style={s.error}>
                      {fieldErrors.comment}
                    </Text>
                  )}
                  {!!formError && (
                    <Text accessibilityRole="alert" style={s.error}>
                      {formError}
                    </Text>
                  )}
                  {!!statusNote && (
                    <Text accessibilityLiveRegion="polite" style={s.note}>
                      {statusNote}
                    </Text>
                  )}
                  {access.isError && (
                    <View style={s.accessError}>
                      <Text style={s.stateCopy}>
                        Could not refresh review access. Refresh before submitting.
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Recheck review access"
                        onPress={() => void refresh()}
                        style={s.secondary}
                      >
                        <Text style={s.secondaryText}>Refresh access</Text>
                      </Pressable>
                    </View>
                  )}
                  {phase === 'uncertain' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Check review submission status"
                      disabled={checking}
                      onPress={() => void checkSubmission()}
                      style={[s.primary, checking && s.disabled]}
                    >
                      {checking && <ActivityIndicator size="small" color="white" />}
                      <Text style={s.primaryText}>
                        {checking ? 'Checking status...' : 'Check submission status'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Submit Review"
                      accessibilityState={{
                        disabled: busy || access.isFetching || access.isError,
                        busy: submitting,
                      }}
                      disabled={busy || access.isFetching || access.isError}
                      onPress={() => void submit()}
                      style={[
                        s.primary,
                        (busy || access.isFetching || access.isError) && s.disabled,
                      ]}
                    >
                      {submitting && <ActivityIndicator size="small" color="white" />}
                      <Text style={s.primaryText}>
                        {submitting ? 'Submitting...' : 'Submit Review'}
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
  );
};
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0F2F5' },
  frame: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: 'white' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F4',
    paddingHorizontal: 16,
    gap: 8,
  },
  back: { width: 36, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#35414F', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  content: { padding: 22, paddingTop: 27, paddingBottom: 35 },
  propertyTitle: { color: '#34414F', fontSize: 17, lineHeight: 25, fontWeight: '700' },
  subtitle: { color: '#949EAA', fontSize: 12, lineHeight: 21, marginTop: 5 },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#EAF9FC',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 12,
  },
  verifiedText: { color: '#00A6BA', fontSize: 10 },
  ratingBox: {
    marginTop: 23,
    backgroundColor: '#F7F9FB',
    borderWidth: 1,
    borderColor: '#EEF1F5',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 12,
  },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  starButton: { flex: 1, minHeight: 46, justifyContent: 'center', alignItems: 'center' },
  ratingLabel: { color: '#A0A8B3', fontSize: 11, textAlign: 'center', marginTop: 5 },
  feedbackLabel: {
    color: '#697583',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 27,
    marginBottom: 10,
  },
  input: {
    minHeight: 165,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E4E9EF',
    backgroundColor: '#F8FAFC',
    padding: 14,
    fontSize: 13,
    lineHeight: 22,
    color: '#4C5B6B',
  },
  invalidInput: { borderColor: '#D98B96' },
  inputHints: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  hint: { fontSize: 10, color: '#A5ADB8' },
  primary: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 23,
    paddingVertical: 12,
    backgroundColor: '#00B8CE',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  primaryText: { color: 'white', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  error: { color: '#C45563', fontSize: 12, lineHeight: 20, marginTop: 10 },
  note: { color: '#00A1B7', fontSize: 12, lineHeight: 20, marginTop: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 13 },
  stateIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F9FC',
    alignSelf: 'center',
    marginBottom: 9,
  },
  stateTitle: {
    color: '#3C4A59',
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '600',
    textAlign: 'center',
  },
  stateCopy: { color: '#94A0AD', fontSize: 13, lineHeight: 22, textAlign: 'center' },
  outcome: { paddingTop: 35, gap: 15 },
  savedReview: {
    borderWidth: 1,
    borderColor: '#E7EBF0',
    borderRadius: 12,
    padding: 17,
    marginTop: 7,
  },
  savedHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  savedDate: { color: '#A4ADB8', fontSize: 10 },
  savedComment: { color: '#7F8D9B', fontSize: 13, lineHeight: 23, marginTop: 14 },
  secondary: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#00A4B9', fontSize: 12, fontWeight: '600' },
  accessError: { marginTop: 15, padding: 12, borderRadius: 8, backgroundColor: '#FFFAEC' },
});
