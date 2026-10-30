import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { KeyboardTypeOptions, StyleProp, ViewStyle } from 'react-native';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react-native';

export const colors = {
  ink: '#193442',
  muted: '#7C8F9B',
  primary: '#00ACC1',
  pale: '#E7F9FB',
  border: '#E4ECEF',
  background: '#F4F8FA',
  navy: '#102C3A',
};

export function AdminButton({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  busy,
  small,
  label,
}: {
  title: string;
  onPress: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      cssInterop={false}
      accessibilityRole="button"
      accessibilityLabel={label || title}
      accessibilityState={{ disabled: !!disabled || !!busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        a.button,
        variant === 'primary'
          ? a.primary
          : variant === 'danger'
            ? a.danger
            : variant === 'ghost'
              ? a.ghost
              : a.secondary,
        small && a.smallButton,
        (pressed || disabled || busy) && a.dim,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#FFF' : colors.primary} />
      ) : (
        icon
      )}
      <Text
        style={[
          a.buttonText,
          variant === 'primary'
            ? { color: '#FFF' }
            : variant === 'danger'
              ? { color: '#DB5865' }
              : { color: colors.ink },
          small && { fontSize: 12 },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function AdminField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  multiline,
  keyboardType,
  disabled,
  style,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helper?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[a.field, style]}>
      <Text style={a.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#A4B2BA"
        editable={!disabled}
        autoCapitalize="none"
        keyboardType={keyboardType}
        multiline={multiline}
        style={[
          a.input,
          multiline && { minHeight: 104, textAlignVertical: 'top' },
          disabled && a.dim,
        ]}
      />
      {!!helper && <Text style={a.helper}>{helper}</Text>}
    </View>
  );
}

export function AdminSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  placeholder = 'Chọn một mục',
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('');
  const selected = options.find((o) => o.value === value);
  const visible = options.filter((o) =>
    o.label.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );
  return (
    <View style={a.field}>
      <Text style={a.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => {
          setSearch('');
          setOpen(true);
        }}
        style={[a.input, a.select, disabled && a.dim]}
      >
        <Text
          numberOfLines={1}
          style={[a.text, { flex: 1, color: selected ? colors.ink : colors.muted }]}
        >
          {selected?.label || placeholder}
        </Text>
        <ChevronDown size={17} color={colors.muted} />
      </Pressable>
      <AdminModal visible={open} title={label} onClose={() => setOpen(false)} width={460}>
        {options.length > 7 && (
          <AdminField
            label="Tìm lựa chọn"
            value={search}
            onChange={setSearch}
            placeholder="Nhập từ khóa..."
          />
        )}
        {visible.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: value === option.value }}
            onPress={() => {
              onChange(option.value);
              setOpen(false);
            }}
            style={a.option}
          >
            <Text style={[a.text, { flex: 1 }]}>{option.label}</Text>
            {value === option.value && <Check size={18} color={colors.primary} />}
          </Pressable>
        ))}
        {!visible.length && <Text style={a.emptyText}>Không tìm thấy lựa chọn phù hợp.</Text>}
      </AdminModal>
    </View>
  );
}

export function AdminModal({
  visible,
  title,
  subtitle,
  children,
  footer,
  onClose,
  busy,
  width = 760,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
  width?: number;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={a.overlay}>
        <View style={[a.modal, { maxWidth: width }]} accessibilityViewIsModal>
          <View style={a.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={a.modalTitle}>
                {title}
              </Text>
              {!!subtitle && <Text style={[a.helper, { marginTop: 5 }]}>{subtitle}</Text>}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Đóng ${title}`}
              disabled={busy}
              onPress={onClose}
              style={a.iconButton}
            >
              <X size={20} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={a.modalBody}>
            {children}
          </ScrollView>
          {!!footer && <View style={a.modalFooter}>{footer}</View>}
        </View>
      </View>
    </Modal>
  );
}

const statuses: Record<string, [string, string, string]> = {
  active: ['Đang hoạt động', '#E8F8F0', '#2A9970'],
  inactive: ['Đã ẩn', '#F0F3F6', '#83929D'],
  blocked: ['Đã khóa', '#FFF0F1', '#D45E6A'],
  pending: ['Chờ xác nhận', '#FFF6E5', '#B78928'],
  confirmed: ['Đã xác nhận', '#E7F7FB', '#198FB0'],
  completed: ['Hoàn thành', '#E8F8F0', '#2A9970'],
  cancelled: ['Đã hủy', '#FFF0F1', '#D45E6A'],
  expired: ['Hết hạn', '#F0F3F6', '#83929D'],
  requested: ['Chờ duyệt', '#FFF6E5', '#B78928'],
  approved: ['Đã duyệt', '#E7F7FB', '#198FB0'],
  rejected: ['Từ chối', '#FFF0F1', '#D45E6A'],
  processing: ['Đang xử lý', '#F1EDFD', '#8A6ACA'],
  succeeded: ['Thành công', '#E8F8F0', '#2A9970'],
  failed: ['Thất bại', '#FFF0F1', '#D45E6A'],
  paid: ['Đã thanh toán', '#E8F8F0', '#2A9970'],
  partially_paid: ['Đã trả một phần', '#E7F7FB', '#198FB0'],
  refunded: ['Đã hoàn tiền', '#F1EDFD', '#8A6ACA'],
  upcoming: ['Sắp bắt đầu', '#E7F7FB', '#198FB0'],
  exhausted: ['Hết lượt dùng', '#FFF6E5', '#B78928'],
  timed_out: ['Hết thời gian', '#F0F3F6', '#83929D'],
};
export function AdminBadge({ status, label }: { status: string; label?: string }) {
  const [text, background, color] = statuses[status] || [status, '#F0F3F6', '#83929D'];
  return (
    <View style={[a.badge, { backgroundColor: background }]}>
      <View style={[a.dot, { backgroundColor: color }]} />
      <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{label || text}</Text>
    </View>
  );
}

export function AdminNotice({
  text,
  error,
  onClose,
}: {
  text: string;
  error?: boolean;
  onClose?: () => void;
}) {
  return (
    <View
      style={[
        a.notice,
        {
          backgroundColor: error ? '#FFF1F2' : '#EAF8F4',
          borderColor: error ? '#F6D8DD' : '#CEEDE1',
        },
      ]}
    >
      <Text
        accessibilityRole={error ? 'alert' : undefined}
        style={{ flex: 1, color: error ? '#B8505D' : '#29866A', fontSize: 13, lineHeight: 21 }}
      >
        {text}
      </Text>
      {onClose && (
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={onClose}>
          <X size={17} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

export function AdminEmpty({
  error,
  onRetry,
  title = 'Chưa có dữ liệu',
  description = 'Dữ liệu mới sẽ xuất hiện tại đây.',
}: {
  error?: string;
  onRetry?: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <View style={a.empty}>
      <View style={a.emptyIcon}>
        <Search size={27} color={colors.primary} />
      </View>
      <Text style={a.emptyTitle}>{error ? 'Không tải được dữ liệu' : title}</Text>
      <Text style={a.emptyText}>{error || description}</Text>
      {onRetry && <AdminButton title="Tải lại" onPress={onRetry} variant="secondary" small />}
    </View>
  );
}

export function AdminPagination({
  page,
  totalPages,
  total,
  busy,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  busy?: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <View style={a.pagination}>
      <Text style={a.helper}>
        {total} kết quả · Trang {page}/{Math.max(1, totalPages)}
      </Text>
      <View style={a.row}>
        <AdminButton
          title="Trước"
          label="Trang trước"
          variant="secondary"
          icon={<ChevronLeft size={15} color={colors.muted} />}
          small
          disabled={busy || page <= 1}
          onPress={() => onPage(page - 1)}
        />
        <AdminButton
          title="Sau"
          label="Trang sau"
          variant="secondary"
          icon={<ChevronRight size={15} color={colors.muted} />}
          small
          disabled={busy || page >= totalPages}
          onPress={() => onPage(page + 1)}
        />
      </View>
    </View>
  );
}

export interface AdminColumn {
  key: string;
  title: string;
  width: number;
  render: (row: any) => React.ReactNode;
}
export function AdminTable({ columns, rows }: { columns: AdminColumn[]; rows: any[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={{ minWidth: columns.reduce((n, c) => n + c.width, 0), flex: 1 }}>
        <View style={a.tableHeader}>
          {columns.map((c) => (
            <View key={c.key} style={{ width: c.width, paddingHorizontal: 16 }}>
              <Text style={a.columnTitle}>{c.title}</Text>
            </View>
          ))}
        </View>
        {rows.map((row) => (
          <View key={row.id} style={a.tableRow}>
            {columns.map((c) => (
              <View key={c.key} style={{ width: c.width, paddingHorizontal: 16 }}>
                {c.render(row)}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export const a = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  text: { fontSize: 13, lineHeight: 20, color: colors.ink },
  muted: { fontSize: 12, lineHeight: 19, color: colors.muted },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 14 },
  button: {
    minHeight: 42,
    borderRadius: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primary: { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary },
  secondary: { backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#F5D8DC' },
  ghost: { backgroundColor: 'transparent' },
  buttonText: { fontSize: 13, fontWeight: '600' },
  smallButton: { minHeight: 32, paddingHorizontal: 10, paddingVertical: 6 },
  dim: { opacity: 0.48 },
  field: { flexGrow: 1, minWidth: 150, gap: 7 },
  label: { color: '#4E6574', fontSize: 12, fontWeight: '600' },
  input: {
    minHeight: 43,
    borderWidth: 1,
    borderColor: '#DDE6EB',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: '#FFF',
  },
  select: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  helper: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,30,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: { fontSize: 19, fontWeight: '700', color: colors.ink },
  modalBody: { padding: 22, gap: 18 },
  modalFooter: {
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  notice: {
    padding: 13,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  empty: { paddingHorizontal: 20, paddingVertical: 48, alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 440,
  },
  pagination: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tableHeader: {
    minHeight: 46,
    backgroundColor: '#F7FAFB',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  columnTitle: { color: '#7F929E', fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 84,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF3F6',
  },
});
