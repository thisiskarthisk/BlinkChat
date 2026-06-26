/**
 * BlinkChat Shared UI Component Library
 * ──────────────────────────────────────
 * Single source of truth for all reusable UI elements.
 * Change once here → updates everywhere in the app.
 *
 * Components exported:
 *  - AppTextInput      Text input with icon, label, error, password toggle
 *  - AppButton         Primary / secondary / ghost / danger button
 *  - AppIconButton     Round icon-only button
 *  - AppDivider        Horizontal divider with optional label
 *  - AppAvatar         User avatar (image or initials fallback)
 *  - AppBadge          Notification / status badge
 *  - AppCard           Elevated card container
 *  - AppModal          Bottom-sheet style modal wrapper
 *  - AppEmptyState     Empty list placeholder with icon and message
 *  - AppLoadingOverlay Full-screen loading indicator
 *  - AppSectionHeader  List section title with optional action
 *  - showAlert         Platform-safe alert (window.alert on web, Alert on native)
 *  - showConfirm       Platform-safe confirmation dialog
 */

import React, { forwardRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Platform-safe alert — browser window.alert on web, native Alert.alert on mobile */
export const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

/** Platform-safe confirmation — window.confirm on web, Alert with buttons on mobile */
export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel'
) => {
  if (Platform.OS === 'web') {
    const ok = window.confirm(`${title}\n${message}`);
    if (ok) onConfirm();
    else onCancel?.();
  } else {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: onCancel },
      { text: confirmLabel, onPress: onConfirm },
    ]);
  }
};

// ─────────────────────────────────────────────
// AppTextInput
// ─────────────────────────────────────────────

export interface AppTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Show eye toggle — automatically sets secureTextEntry */
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      isPassword = false,
      containerStyle,
      labelStyle,
      inputStyle,
      style,
      ...rest
    },
    ref
  ) => {
    const { colors } = useTheme();
    const [showPassword, setShowPassword] = useState(false);

    const borderColor = error ? '#EF4444' : colors.border;

    return (
      <View style={[inputStyles.wrapper, containerStyle]}>
        {label && (
          <Text style={[inputStyles.label, { color: colors.textSecondary }, labelStyle]}>
            {label}
          </Text>
        )}

        <View
          style={[
            inputStyles.inputRow,
            {
              backgroundColor: colors.backgroundElement,
              borderColor,
              borderWidth: 1,
            },
          ]}
        >
          {leftIcon && <View style={inputStyles.leftIcon}>{leftIcon}</View>}

          <TextInput
            ref={ref}
            style={[
              inputStyles.input,
              { color: colors.text },
              !leftIcon && { paddingLeft: 14 },
              !rightIcon && !isPassword && { paddingRight: 14 },
              inputStyle,
              style,
            ]}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={isPassword && !showPassword}
            autoComplete="off"
            {...rest}
          />

          {isPassword ? (
            <TouchableOpacity
              style={inputStyles.rightIcon}
              onPress={() => setShowPassword(v => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
                {showPassword ? '🙈' : '👁️'}
              </Text>
            </TouchableOpacity>
          ) : rightIcon ? (
            <View style={inputStyles.rightIcon}>{rightIcon}</View>
          ) : null}
        </View>

        {error ? (
          <Text style={inputStyles.error}>{error}</Text>
        ) : hint ? (
          <Text style={[inputStyles.hint, { color: colors.textSecondary }]}>{hint}</Text>
        ) : null}
      </View>
    );
  }
);

AppTextInput.displayName = 'AppTextInput';

const inputStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 50,
    overflow: 'hidden',
  },
  leftIcon: { paddingLeft: 14, paddingRight: 8 },
  rightIcon: { paddingRight: 14, paddingLeft: 8 },
  input: {
    flex: 1,
    fontSize: 16, // ≥16 prevents iOS/Android browser zoom on focus
    paddingVertical: 12,
    fontWeight: '500',
  },
  error: { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 4 },
  hint: { fontSize: 12, marginTop: 4, marginLeft: 4 },
});

// ─────────────────────────────────────────────
// AppButton
// ─────────────────────────────────────────────

export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type AppButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  labelStyle,
  fullWidth = true,
}) => {
  const { colors } = useTheme();

  const heights: Record<AppButtonSize, number> = { sm: 38, md: 50, lg: 58 };
  const fontSizes: Record<AppButtonSize, number> = { sm: 13, md: 15, lg: 16 };
  const radii: Record<AppButtonSize, number> = { sm: 10, md: 14, lg: 18 };

  const bg: Record<AppButtonVariant, string> = {
    primary: colors.accent,
    secondary: colors.backgroundElement,
    ghost: 'transparent',
    danger: '#EF4444',
  };

  const textColors: Record<AppButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: colors.text,
    ghost: colors.accent,
    danger: '#FFFFFF',
  };

  const borderColors: Record<AppButtonVariant, string | undefined> = {
    primary: undefined,
    secondary: colors.border,
    ghost: colors.accent,
    danger: undefined,
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.78}
      style={[
        btnStyles.base,
        {
          height: heights[size],
          backgroundColor: bg[variant],
          borderRadius: radii[size],
          borderWidth: borderColors[variant] ? 1 : 0,
          borderColor: borderColors[variant],
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' ? colors.accent : '#FFF'}
          size="small"
        />
      ) : (
        <>
          {leftIcon && <View style={btnStyles.leftIcon}>{leftIcon}</View>}
          <Text
            style={[
              btnStyles.label,
              { fontSize: fontSizes[size], color: textColors[variant] },
              labelStyle,
            ]}
          >
            {label}
          </Text>
          {rightIcon && <View style={btnStyles.rightIcon}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
};

const btnStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: { fontWeight: '700', letterSpacing: 0.2 },
  leftIcon: { marginRight: 8 },
  rightIcon: { marginLeft: 8 },
});

// ─────────────────────────────────────────────
// AppIconButton
// ─────────────────────────────────────────────

export interface AppIconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hitSlop?: number;
}

export const AppIconButton: React.FC<AppIconButtonProps> = ({
  icon,
  onPress,
  size = 40,
  backgroundColor,
  style,
  disabled = false,
  hitSlop = 8,
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor ?? colors.backgroundElement,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon}
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// AppDivider
// ─────────────────────────────────────────────

export interface AppDividerProps {
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export const AppDivider: React.FC<AppDividerProps> = ({ label, style }) => {
  const { colors } = useTheme();
  return (
    <View style={[dividerStyles.row, style]}>
      <View style={[dividerStyles.line, { backgroundColor: colors.border }]} />
      {label && (
        <Text style={[dividerStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      )}
      {label && <View style={[dividerStyles.line, { backgroundColor: colors.border }]} />}
    </View>
  );
};

const dividerStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  line: { flex: 1, height: 1 },
  label: { marginHorizontal: 12, fontSize: 12, fontWeight: '600' },
});

// ─────────────────────────────────────────────
// AppAvatar
// ─────────────────────────────────────────────

export interface AppAvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

const getInitialsFromName = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : parts[0][0].toUpperCase();
};

const AVATAR_COLORS = [
  '#2563EB', '#7C3AED', '#DB2777', '#059669', '#D97706',
  '#0891B2', '#DC2626', '#65A30D', '#9333EA', '#0284C7',
];
const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export const AppAvatar: React.FC<AppAvatarProps> = ({
  uri,
  name = '',
  size = 44,
  style,
  onPress,
}) => {
  const initials = getInitialsFromName(name);
  const bgColor = getAvatarColor(name || '?');
  const fontSize = size * 0.38;

  const content = uri ? (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFF', fontSize, fontWeight: '700' }}>{initials}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={style}>{content}</View>;
};

// ─────────────────────────────────────────────
// AppBadge
// ─────────────────────────────────────────────

export interface AppBadgeProps {
  count?: number;
  dot?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  count,
  dot = false,
  color = '#EF4444',
  style,
}) => {
  if (!dot && (count === undefined || count <= 0)) return null;

  const label = count !== undefined && count > 99 ? '99+' : String(count ?? '');

  return (
    <View
      style={[
        badgeStyles.badge,
        {
          backgroundColor: color,
          minWidth: dot ? 10 : 18,
          height: dot ? 10 : 18,
          borderRadius: dot ? 5 : 9,
          paddingHorizontal: dot ? 0 : 4,
        },
        style,
      ]}
    >
      {!dot && (
        <Text style={badgeStyles.label}>{label}</Text>
      )}
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  label: { color: '#FFF', fontSize: 10, fontWeight: '800', lineHeight: 14 },
});

// ─────────────────────────────────────────────
// AppCard
// ─────────────────────────────────────────────

export interface AppCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: number;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  style,
  onPress,
  padding = 16,
}) => {
  const { colors } = useTheme();

  const inner = (
    <View
      style={[
        cardStyles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
};

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});

// ─────────────────────────────────────────────
// AppModal  (bottom-sheet style)
// ─────────────────────────────────────────────

export interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const AppModal: React.FC<AppModalProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={modalStyles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              modalStyles.sheet,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
              },
            ]}
          >
            {/* Handle bar */}
            <View style={[modalStyles.handle, { backgroundColor: colors.border }]} />

            {title && (
              <View style={modalStyles.titleRow}>
                <Text style={[modalStyles.title, { color: colors.text }]}>{title}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 22, lineHeight: 26 }}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '92%' as any,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: { fontSize: 18, fontWeight: '700' },
});

// ─────────────────────────────────────────────
// AppEmptyState
// ─────────────────────────────────────────────

export interface AppEmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export const AppEmptyState: React.FC<AppEmptyStateProps> = ({
  icon = '📭',
  title,
  subtitle,
  action,
}) => {
  const { colors } = useTheme();
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>{icon}</Text>
      <Text style={[emptyStyles.title, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[emptyStyles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
      {action && (
        <AppButton
          label={action.label}
          onPress={action.onPress}
          variant="primary"
          size="sm"
          fullWidth={false}
          style={{ marginTop: 20 }}
        />
      )}
    </View>
  );
};

const emptyStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});

// ─────────────────────────────────────────────
// AppLoadingOverlay
// ─────────────────────────────────────────────

export interface AppLoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const AppLoadingOverlay: React.FC<AppLoadingOverlayProps> = ({
  visible,
  message,
}) => {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View style={loadingStyles.overlay}>
      <View style={[loadingStyles.box, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        {message && (
          <Text style={[loadingStyles.text, { color: colors.textSecondary }]}>{message}</Text>
        )}
      </View>
    </View>
  );
};

const loadingStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  box: {
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  text: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
});

// ─────────────────────────────────────────────
// AppSectionHeader  (list section title)
// ─────────────────────────────────────────────

export interface AppSectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}

export const AppSectionHeader: React.FC<AppSectionHeaderProps> = ({
  title,
  action,
  style,
}) => {
  const { colors } = useTheme();
  return (
    <View style={[sectionStyles.row, style]}>
      <Text style={[sectionStyles.title, { color: colors.textSecondary }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={[sectionStyles.action, { color: colors.accent }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  action: { fontSize: 13, fontWeight: '600' },
});
