import { useUiPreferences, uiText, uiColor, uiTextStyle, uiStyle } from '../../preferences/ui';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Check, ImagePlus, Plus, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import type { AdminRecord } from '../../types/admin';
import { adminGet, adminOptions, adminSave, uploadAdminImage } from '../../services/admin';
import {
  adminError,
  AdminFormValues,
  buildAdminPayload,
  categoryImage,
  isAdminAccessError,
} from '../../utils/admin';
import { apiClient } from '../../services/apiClient';
import {
  a,
  AdminButton,
  AdminField,
  AdminModal,
  AdminNotice,
  AdminSelect,
  colors,
} from './AdminUI';

type Photo = { photoUrl: string; isCover: boolean; caption?: string; role?: string; altText?: string };
interface Props {
  resource: 'listings' | 'categories' | 'customers' | 'coupons';
  record?: AdminRecord;
  categories: AdminRecord[];
  onClose: () => void;
  onAccessError: () => void;
  onSaved: (message: string) => void;
}
const labels = {
  listings: 'chỗ ở',
  categories: 'danh mục',
  customers: 'khách hàng',
  coupons: 'coupon',
};
const mapping: Record<string, string> = {
  hostId: 'host_id',
  categoryId: 'category_id',
  title: 'title',
  description: 'description',
  propertyType: 'property_type',
  roomType: 'room_type',
  address: 'address',
  city: 'city',
  country: 'country',
  region: 'region',
  latitude: 'latitude',
  longitude: 'longitude',
  pricePerNight: 'price_per_night',
  cleaningFee: 'cleaning_fee',
  serviceFee: 'service_fee',
  maxGuests: 'max_guests',
  bedrooms: 'bedrooms',
  beds: 'beds',
  bathrooms: 'bathrooms',
  checkInTime: 'check_in_time',
  checkOutTime: 'check_out_time',
  isActive: 'is_active',
  name: 'name',
  slug: 'slug',
  iconName: 'icon_name',
  fullName: 'full_name',
  phoneNumber: 'phone_number',
  email: 'email',
  code: 'code',
  discountPercent: 'discount_percent',
  maxDiscount: 'max_discount',
  minSubtotal: 'min_subtotal',
  startsAt: 'starts_at',
  endsAt: 'ends_at',
  maxUses: 'max_uses',
  perUserLimit: 'per_user_limit',
  listingId: 'listing_id',
};
const defaults: AdminFormValues = {
  propertyType: 'Apartment',
  roomType: 'entire_place',
  country: 'Vietnam',
  region: 'Asia',
  pricePerNight: '',
  cleaningFee: '0',
  serviceFee: '0',
  maxGuests: '2',
  bedrooms: '1',
  beds: '1',
  bathrooms: '1',
  checkInTime: '14:00',
  checkOutTime: '12:00',
  isActive: 'true',
  mediaUsageStatus: 'needs_review',
  iconName: 'home',
  discountPercent: '10',
  minSubtotal: '0',
  maxUses: '100',
  perUserLimit: '1',
  startsAt: `${new Date().toISOString().slice(0, 10)}T00:00:00Z`,
  endsAt: '',
};
const valuesFor = (row: AdminRecord | undefined, adminId?: string): AdminFormValues => ({
  ...defaults,
  hostId: adminId || '',
  ...Object.fromEntries(
    Object.entries(mapping)
      .filter(([, key]) => row?.[key] != null)
      .map(([key, raw]) => [key, String(row![raw])])
  ),
});

export function AdminEditor({
  resource,
  record,
  categories,
  onClose,
  onSaved,
  onAccessError,
}: Props) {
  useUiPreferences();
  const { user } = useAuth();
  const [values, setValues] = useState<AdminFormValues>(() => valuesFor(record, user?.id));
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState('');
  const pending = useRef(false);
  const detail = useQuery({
    queryKey: ['admin', user?.id, 'edit', resource, record?.id],
    queryFn: ({ signal }) => adminGet(resource, record!.id, signal),
    enabled: !!record && resource !== 'customers',
    retry: false,
  });
  const hosts = useQuery({
    queryKey: ['admin', user?.id, 'host-options'],
    queryFn: ({ signal }) => adminOptions('customers', signal),
    enabled: resource === 'listings',
    retry: false,
  });
  const amenities = useQuery({
    queryKey: ['admin', user?.id, 'amenity-options'],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get('/amenities', { signal });
      if (!response.data.success || !Array.isArray(response.data.data))
        throw new Error('Không tải được tiện ích.');
      return response.data.data as AdminRecord[];
    },
    enabled: resource === 'listings',
    retry: false,
  });

  useEffect(() => {
    if ([detail.error, hosts.error, amenities.error].some(isAdminAccessError)) onAccessError();
  }, [detail.error, hosts.error, amenities.error, onAccessError]);

  useEffect(() => {
    if (!detail.data) return;
    const nextValues=valuesFor(detail.data, user?.id);
    if (resource === 'listings') {
      setAmenityIds(detail.data.amenityIds || []);
      const all: any[] = detail.data.photos || [];
      const audit=detail.data.sourceAudit;
      const context=all.find(photo=>photo.media_context)?.media_context;
      Object.assign(nextValues,{
        sourcePageUrl:audit?.source_page_url||'',mediaUsageStatus:audit?.media_usage_status||'needs_review',
        contextEvidence:audit?.context_evidence||context?.contextEvidence||'',reviewNotes:audit?.review_notes||'',
        mediaProvider:context?.provider||'',mediaCreator:context?.creator||'',licenseName:context?.licenseName||'',
        licenseUrl:context?.licenseUrl||'',attributionText:context?.attributionText||'',
      });
      setPhotos(
        [...all]
          .sort((first, second) => Number(second.is_cover) - Number(first.is_cover))
          .map((p, i) => ({ photoUrl: p.photo_url, caption: p.caption || '', isCover: i === 0,
            role:p.media_context?.role||(i===0?'cover':'other'),altText:p.media_context?.altText||p.caption||'' }))
      );
    }
    setValues(nextValues);
  }, [detail.data, resource, user?.id]);

  const change = (key: string) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const field = (
    key: string,
    label: string,
    options: { helper?: string; placeholder?: string; multiline?: boolean; numeric?: boolean } = {}
  ) => (
    <AdminField
      key={key}
      label={uiText(label)}
      value={values[key] || ''}
      onChange={change(key)}
      disabled={busy || uploading}
      helper={options.helper}
      placeholder={uiText(options.placeholder)}
      multiline={options.multiline}
      keyboardType={options.numeric ? 'decimal-pad' : 'default'}
    />
  );
  const choose = (key: string, label: string, options: { value: string; label: string }[]) => (
    <AdminSelect
      key={key}
      label={uiText(label)}
      value={values[key] || ''}
      onChange={change(key)}
      options={options}
      disabled={busy || uploading}
    />
  );
  const upload = async (isIcon = false) => {
    if (uploading || pending.current) return;
    setUploading(true);
    setError('');
    try {
      const image = await uploadAdminImage();
      if (!image) return;
      if (isIcon) change('iconName')(image.iconName);
      else setPhotos((current) => [...current, { photoUrl: image.url, isCover: !current.length,role:current.length?'other':'cover',altText:'' }]);
    } catch (failure) {
      if (isAdminAccessError(failure)) onAccessError();
      else setError(adminError(failure));
    } finally {
      setUploading(false);
    }
  };
  const save = async () => {
    if (pending.current || uploading) return;
    setError('');
    try {
      const payload = buildAdminPayload(resource, values, amenityIds, photos);
      if (
        resource === 'coupons' &&
        Number((payload as any).maxUses) <
          Number(detail.data?.used_count || record?.used_count || 0)
      )
        throw new Error('Số lượng phát hành không được nhỏ hơn số lượt đã dùng.');
      pending.current = true;
      setBusy(true);
      const result = await adminSave(resource, payload, record?.id);
      onSaved(
        result.auth_sync_pending
          ? 'Thông tin đã lưu; email đang chờ đồng bộ xác thực. Có thể thử đồng bộ lại từ danh sách khách hàng.'
          : `Đã ${record ? 'cập nhật' : 'thêm'} ${labels[resource]} thành công.`
      );
    } catch (failure) {
      if (isAdminAccessError(failure)) onAccessError();
      else setError(adminError(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const isLoading = !!record && resource !== 'customers' && detail.isLoading;
  const invalid = !!detail.error && !!record && resource !== 'customers';
  const activeCategory = categories.filter(
    (c) => c.is_active !== false || c.id === values.categoryId
  );
  const hostOptions = [
    { value: user?.id || '', label: `${user?.full_name || 'Tôi'} (quản trị viên)` },
    ...(hosts.data || [])
      .filter((h) => h.role === 'host' && h.account_status !== 'blocked')
      .map((h) => ({ value: h.id, label: `${h.full_name} · ${h.email}` })),
  ];
  if (values.hostId && !hostOptions.some((h) => h.value === values.hostId))
    hostOptions.push({
      value: values.hostId,
      label: `Chủ chỗ ở hiện tại · ${values.hostId.slice(0, 8)}`,
    });
  const categoryOptions = activeCategory.map((c) => ({ value: c.id, label: c.name }));

  return (
    <AdminModal
      visible
      title={uiText(`${record ? 'Chỉnh sửa' : 'Thêm'} ${labels[resource]}`)}
      subtitle={
        resource === 'listings'
          ? 'Thông tin được dùng trên ứng dụng đặt phòng. Giá và phí tính bằng USD.'
          : 'Kiểm tra thông tin trước khi lưu thay đổi.'
      }
      onClose={onClose}
      busy={busy || uploading}
      footer={
        <>
          <AdminButton
            title={uiText("Hủy bỏ")}
            variant="secondary"
            onPress={onClose}
            disabled={busy || uploading}
          />
          <AdminButton
            title={uiText("Lưu thay đổi")}
            onPress={() => void save()}
            busy={busy}
            disabled={isLoading || invalid || uploading}
          />
        </>
      }
    >
      {!!error && <AdminNotice text={error} error />}
      {isLoading ? (
        <ActivityIndicator color={uiColor(colors.primary)} />
      ) : invalid ? (
        <>
          <AdminNotice text={adminError(detail.error)} error />
          <AdminButton
            title={uiText("Tải lại chi tiết")}
            variant="secondary"
            onPress={() => void detail.refetch()}
          />
        </>
      ) : (
        <>
          {resource === 'listings' && (
            <>
              <Text style={uiTextStyle(a.sectionTitle)}>{uiText("Thông tin chỗ ở")}</Text>
              {field('title', 'Tên chỗ ở *')}
              <View style={uiStyle(a.wrap)}>
                {choose('hostId', 'Chủ chỗ ở *', hostOptions)}
                {choose('categoryId', 'Danh mục *', categoryOptions)}
              </View>
              {(hosts.error || amenities.error) && (
                <AdminNotice
                  text="Không tải đầy đủ lựa chọn. Tải lại trước khi thay đổi chủ chỗ ở hoặc tiện ích."
                  error
                />
              )}
              <View style={uiStyle(a.wrap)}>
                {field('propertyType', 'Loại hình *', {
                  placeholder: 'Apartment, Villa, Homestay...',
                })}
                {choose('roomType', 'Loại phòng *', [
                  { value: 'entire_place', label: 'Toàn bộ chỗ ở' },
                  { value: 'private_room', label: 'Phòng riêng' },
                  { value: 'dormitory', label: 'Phòng tập thể' },
                ])}
              </View>
              {field('address', 'Địa chỉ *')}
              <View style={uiStyle(a.wrap)}>
                {field('city', 'Thành phố *')}
                {field('country', 'Quốc gia *')}
                {field('region', 'Khu vực *')}
              </View>
              <View style={uiStyle(a.wrap)}>
                {field('latitude', 'Vĩ độ', { placeholder: '-90 đến 90' })}
                {field('longitude', 'Kinh độ', { placeholder: '-180 đến 180' })}
              </View>
              {field('description', 'Mô tả', { multiline: true })}
              <Text style={uiTextStyle(a.sectionTitle)}>{uiText("Sức chứa & giá")}</Text>
              <View style={uiStyle(a.wrap)}>
                {field('maxGuests', 'Số khách tối đa *', { numeric: true })}
                {field('bedrooms', 'Phòng ngủ *', { numeric: true })}
                {field('beds', 'Số giường *', { numeric: true })}
                {field('bathrooms', 'Phòng tắm *', { numeric: true })}
              </View>
              <View style={uiStyle(a.wrap)}>
                {field('pricePerNight', 'Giá mỗi đêm (USD) *', { numeric: true })}
                {field('cleaningFee', 'Phí dọn dẹp (USD)', { numeric: true })}
                {field('serviceFee', 'Phí dịch vụ (USD)', { numeric: true })}
              </View>
              <View style={uiStyle(a.wrap)}>
                {field('checkInTime', 'Giờ nhận phòng', { placeholder: '14:00' })}
                {field('checkOutTime', 'Giờ trả phòng', { placeholder: '12:00' })}
              </View>
              <Text style={uiTextStyle(a.sectionTitle)}>{uiText("Tiện ích")}</Text>
              {amenities.isLoading ? (
                <ActivityIndicator color={uiColor(colors.primary)} />
              ) : (
                <View style={uiStyle(a.wrap)}>
                  {(amenities.data || []).map((item) => {
                    const selected = amenityIds.includes(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="checkbox"
                        accessibilityLabel={uiText(item.name)}
                        accessibilityState={{ checked: selected }}
                        disabled={busy || uploading}
                        onPress={() =>
                          setAmenityIds((current) =>
                            selected
                              ? current.filter((id) => id !== item.id)
                              : [...current, item.id]
                          )
                        }
                        style={uiStyle([
                          a.row,
                          {
                            padding: 10,
                            borderRadius: 7,
                            borderWidth: 1,
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.pale : '#FFF',
                          },
                        ])}
                      >
                        <Check size={14} color={uiColor(selected ? colors.primary : '#D2DCE1')} />
                        <Text style={uiTextStyle(a.text)}>{uiText(item.name)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <Text style={uiTextStyle(a.sectionTitle)}>{uiText("Bộ sưu tập ảnh *")}</Text>
              <Text style={uiTextStyle(a.helper)}>{uiText("Ảnh đầu tiên là ảnh bìa. Listing chưa hiển thị có thể lưu khi chưa có ảnh; trước khi bật phải duyệt nguồn và quyền sử dụng.")}</Text>
              <View style={uiStyle(a.wrap)}>
                {photos.map((photo, index) => (
                  <View key={`${photo.photoUrl}-${index}`} style={uiStyle({ width: 230, gap: 7 })}>
                    <Image
                      source={{ uri: photo.photoUrl }}
                      style={uiStyle({
                        width: 230,
                        height: 150,
                        borderRadius: 8,
                        backgroundColor: colors.background,
                      })}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={uiText(`Đặt ảnh ${index + 1} làm ảnh bìa`)}
                      disabled={busy || uploading}
                      onPress={() =>
                        setPhotos((current) => [{...current[index],role:'cover'},...current.filter((_, i) => i !== index).map(item=>item.role==='cover'?{...item,role:'other'}:item)])
                      }
                    >
                      <Text
                        style={uiTextStyle([a.helper, { color: index === 0 ? colors.primary : colors.muted }])}
                      >
                        {index === 0 ? uiText('✓ Ảnh bìa') : uiText('Đặt làm ảnh bìa')}
                      </Text>
                    </Pressable>
                    <AdminField label={uiText("Chú thích")} value={photo.caption||''} disabled={busy||uploading}
                      onChange={value=>setPhotos(current=>current.map((item,i)=>i===index?{...item,caption:value}:item))}/>
                    <AdminField label={uiText("Văn bản thay thế")} value={photo.altText||''} disabled={busy||uploading}
                      onChange={value=>setPhotos(current=>current.map((item,i)=>i===index?{...item,altText:value}:item))}/>
                    <AdminSelect label={uiText("Vai trò ảnh")} value={index===0?'cover':photo.role||'other'} disabled={busy||uploading||index===0}
                      onChange={value=>setPhotos(current=>current.map((item,i)=>i===index?{...item,role:value}:item))}
                      options={[
                        {value:'cover',label:'Ảnh bìa'},{value:'bedroom',label:'Phòng ngủ'},{value:'bathroom',label:'Phòng tắm'},
                        {value:'common_area',label:'Không gian chung'},{value:'exterior',label:'Bên ngoài'},{value:'view',label:'Quang cảnh'},
                        {value:'amenity',label:'Tiện nghi'},{value:'other',label:'Khác'},
                      ]}/>
                    <AdminButton
                      title={uiText("Xóa ảnh")}
                      label={uiText(`Xóa ảnh ${index + 1}`)}
                      small
                      variant="danger"
                      disabled={busy || uploading}
                      onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                    />
                  </View>
                ))}
              </View>
              <AdminButton
                title={uiText("Tải ảnh lên")}
                variant="secondary"
                icon={<ImagePlus size={17} color={uiColor(colors.primary)} />}
                onPress={() => void upload()}
                busy={uploading}
                disabled={busy || photos.length >= 30}
              />
              <View style={uiStyle([a.wrap, { alignItems: 'flex-end' }])}>
                <AdminField
                  label={uiText("Hoặc dùng đường dẫn ảnh")}
                  value={photoUrl}
                  onChange={setPhotoUrl}
                  placeholder={uiText("https://...")}
                  disabled={busy || uploading}
                />
                <AdminButton
                  title={uiText("Thêm ảnh")}
                  variant="secondary"
                  disabled={busy || uploading || photos.length >= 30}
                  icon={<Plus size={15} color={uiColor(colors.primary)} />}
                  onPress={() => {
                    try {
                      const url = new URL(photoUrl.trim());
                      if (url.protocol !== 'https:') throw new Error();
                      setPhotos((current) => [
                        ...current,
                        { photoUrl: url.toString(), isCover: !current.length,role:current.length?'other':'cover',altText:'' },
                      ]);
                      setPhotoUrl('');
                      setError('');
                    } catch {
                      setError('Nhập đường dẫn ảnh HTTPS hợp lệ.');
                    }
                  }}
                />
              </View>
              <Text style={uiTextStyle(a.sectionTitle)}>{uiText("Nguồn và quyền sử dụng ảnh")}</Text>
              <Text style={uiTextStyle(a.helper)}>{uiText("Để trống trang nguồn cho listing demo cũ. Với 35 homestay có provenance, chỉ chọn “Đã duyệt” khi có bằng chứng quyền sử dụng rõ ràng.")}</Text>
              {field('sourcePageUrl','Trang nguồn chính thức',{placeholder:'https://...'})}
              {choose('mediaUsageStatus','Trạng thái duyệt media',[
                {value:'needs_review',label:'Cần duyệt thêm'},{value:'blocked',label:'Đang bị chặn'},{value:'approved',label:'Đã duyệt'},
              ])}
              {field('contextEvidence','Bằng chứng ảnh đúng cơ sở',{multiline:true})}
              {field('reviewNotes','Ghi chú duyệt',{multiline:true})}
              {values.mediaUsageStatus==='approved'&&<>
                <View style={uiStyle(a.wrap)}>
                  {field('mediaProvider','Nhà cung cấp ảnh *')}
                  {field('mediaCreator','Tác giả/chủ ảnh *')}
                  {field('licenseName','Tên giấy phép/văn bản đồng ý *')}
                </View>
                {field('licenseUrl','URL bằng chứng quyền sử dụng *',{placeholder:'https://...'})}
                {field('attributionText','Nội dung ghi công *',{multiline:true})}
              </>}
            </>
          )}
          {resource === 'categories' && (
            <>
              {field('name', 'Tên danh mục *')}
              {field('slug', 'Slug *', {
                placeholder: 'beach',
                helper: 'Chữ thường, số và dấu gạch ngang. Ví dụ: eco-stay.',
              })}
              {choose('iconName', 'Biểu tượng', [
                ...[
                  'home',
                  'beach',
                  'mountain',
                  'camping',
                  'countryside',
                  'city',
                  'lake',
                  'tropical',
                  'desert',
                ].map((icon) => ({ value: icon, label: icon })),
                ...(values.iconName?.startsWith('media:')
                  ? [{ value: values.iconName, label: 'Ảnh biểu tượng đã tải lên' }]
                  : []),
              ])}
              {categoryImage(values.iconName) && (
                <Image
                  source={{ uri: categoryImage(values.iconName) }}
                  style={uiStyle({ width: 64, height: 64, borderRadius: 10 })}
                />
              )}
              <AdminButton
                title={uiText("Tải biểu tượng lên")}
                variant="secondary"
                onPress={() => void upload(true)}
                busy={uploading}
                disabled={busy}
                icon={<ImagePlus size={16} color={uiColor(colors.primary)} />}
              />
              {field('description', 'Mô tả danh mục', { multiline: true })}
            </>
          )}
          {resource === 'customers' && (
            <>
              {field('fullName', 'Họ tên *')}
              {field('email', 'Email *')}
              {field('phoneNumber', 'Số điện thoại')}
              <Text style={uiTextStyle(a.helper)}>{uiText("Email sẽ được đồng bộ với hệ thống xác thực. Vai trò tài khoản không được thay đổi tại đây.")}</Text>
            </>
          )}
          {resource === 'coupons' && (
            <>
              {field('code', 'Mã coupon *', { placeholder: 'SUMMERSALE' })}
              <View style={uiStyle(a.wrap)}>
                {field('discountPercent', 'Giảm giá (%) *', { numeric: true })}
                {field('maxDiscount', 'Giảm tối đa (USD)', {
                  numeric: true,
                  helper: 'Để trống nếu không giới hạn.',
                })}
                {field('minSubtotal', 'Giá trị phòng tối thiểu (USD)', { numeric: true })}
              </View>
              {field('startsAt', 'Thời điểm bắt đầu *', {
                placeholder: '2026-11-01T00:00:00Z',
                helper: 'Định dạng ISO có múi giờ. Z là UTC, +07:00 là giờ Việt Nam.',
              })}
              {field('endsAt', 'Thời điểm kết thúc *', { placeholder: '2026-12-01T00:00:00Z' })}
              <View style={uiStyle(a.wrap)}>
                {field('maxUses', 'Số lượt phát hành *', { numeric: true })}
                {field('perUserLimit', 'Lượt tối đa mỗi khách *', { numeric: true })}
              </View>
              <Text style={uiTextStyle(a.helper)}>{uiText("Đã sử dụng: ")}{uiText(detail.data?.used_count || record?.used_count || 0)}{uiText(" lượt. Số lượng phát hành không được thấp hơn số này.")}</Text>
              {choose('categoryId', 'Giới hạn danh mục', [
                { value: '', label: 'Tất cả danh mục' },
                ...categoryOptions,
              ])}
              {field('listingId', 'Giới hạn chỗ ở (tùy chọn)', {
                placeholder: 'ID chỗ ở',
                helper:
                  'Để trống để áp dụng mọi chỗ ở trong phạm vi danh mục. ID có thể sao chép từ danh sách chỗ ở.',
              })}
            </>
          )}
          {resource !== 'customers' &&
            choose('isActive', 'Hiển thị / hiệu lực', [
              { value: 'true', label: 'Đang hoạt động' },
              { value: 'false', label: 'Đã ẩn / ngừng áp dụng' },
            ])}
        </>
      )}
    </AdminModal>
  );
}
