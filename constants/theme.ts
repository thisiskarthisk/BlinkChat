// /**
//  * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
//  * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
//  */

// import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// export const Fonts = Platform.select({
//   ios: {
//     /** iOS `UIFontDescriptorSystemDesignDefault` */
//     sans: 'system-ui',
//     /** iOS `UIFontDescriptorSystemDesignSerif` */
//     serif: 'ui-serif',
//     /** iOS `UIFontDescriptorSystemDesignRounded` */
//     rounded: 'ui-rounded',
//     /** iOS `UIFontDescriptorSystemDesignMonospaced` */
//     mono: 'ui-monospace',
//   },
//   default: {
//     sans: 'normal',
//     serif: 'serif',
//     rounded: 'normal',
//     mono: 'monospace',
//   },
//   web: {
//     sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
//     serif: "Georgia, 'Times New Roman', serif",
//     rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
//     mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
//   },
// });



import '@/global.css';
import { Platform } from 'react-native';

export type ThemeName = 'editorial' | 'ocean' | 'forest' | 'royal' | 'minimal' | 'midnight' | 'sunrise' | 'lavender' | 'chocolate' | 'steel';

export interface ThemeColors {
  dark: boolean;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  accentSecondary: string;
  cardBg: string;
  error: string;
  success: string;
}

export type ThemeColor = keyof ThemeColors;

export const Themes: Record<ThemeName, ThemeColors> = {
  minimal: {
    dark: false,
    background: '#FFFFFF',
    backgroundElement: '#F8FAFC',
    backgroundSelected: '#F1F5F9',
    surface: '#FFFFFF',
    text: '#0F172A', // Midnight Navy
    textSecondary: '#64748B', // Slate
    border: '#E2E8F0',
    accent: '#0F172A', // Black
    accentSecondary: '#94A3B8', // Gray
    cardBg: '#FFFFFF',
    error: '#E11D48',
    success: '#0F172A',
  },
  editorial: {
    dark: false,
    background: '#FDF6ED', // Warm Cream
    backgroundElement: '#F5EBD8', // Parchment
    backgroundSelected: '#E2CEB0', // Tan
    surface: '#FFFFFF',
    text: '#2C1A0E', // Ink
    textSecondary: '#7A5C46', // Bronze
    border: '#E2CEB0',
    accent: '#C1440E', // Terracotta
    accentSecondary: '#E8A020', // Saffron Gold
    cardBg: '#FFFAF4',
    error: '#D94040',
    success: '#6B7C5C',
  },
  ocean: {
    dark: true,
    background: '#020617', // Deep Sea Black
    backgroundElement: '#0F172A', // Navy
    backgroundSelected: '#1E293B', // Slate
    surface: '#0F172A',
    text: '#F0F9FF', // Ice
    textSecondary: '#7DD3FC', // Sky
    border: '#1E293B',
    accent: '#0EA5E9', // Electric Blue
    accentSecondary: '#22D3EE', // Cyan
    cardBg: '#0F172A',
    error: '#F43F5E',
    success: '#10B981',
  },
  forest: {
    dark: true,
    background: '#022C22', // Deep Jungle
    backgroundElement: '#064E3B', // Emerald
    backgroundSelected: '#065F46', // Teal
    surface: '#064E3B',
    text: '#F0FDF4', // Mint
    textSecondary: '#4ADE80', // Leaf
    border: '#065F46',
    accent: '#22C55E', // Vivid Green
    accentSecondary: '#A3E635', // Lime
    cardBg: '#064E3B',
    error: '#EF4444',
    success: '#22C55E',
  },
  royal: {
    dark: true,
    background: '#1E1B4B', // Midnight Purple
    backgroundElement: '#312E81', // Indigo Deep
    backgroundSelected: '#4338CA', // Indigo
    surface: '#312E81',
    text: '#F5F3FF', // Silk
    textSecondary: '#C4B5FD', // Lavender
    border: '#4338CA',
    accent: '#8B5CF6', // Violet
    accentSecondary: '#D946EF', // Fuchsia
    cardBg: '#312E81',
    error: '#F43F5E',
    success: '#8B5CF6',
  },
  midnight: {
    dark: true,
    background: '#000000', // Pure Black
    backgroundElement: '#111111', // Near Black
    backgroundSelected: '#222222', // Dark Gray
    surface: '#111111',
    text: '#FFFFFF', // White
    textSecondary: '#A1A1AA', // Muted Gray
    border: '#27272A',
    accent: '#F59E0B', // Gold
    accentSecondary: '#D97706', // Deep Gold
    cardBg: '#111111',
    error: '#EF4444',
    success: '#10B981',
  },
  sunrise: {
    dark: false,
    background: '#FFF7ED', // Soft Peach
    backgroundElement: '#FFEDD5', // Orange Tint
    backgroundSelected: '#FED7AA', // Peach Tint
    surface: '#FFFFFF',
    text: '#7C2D12', // Deep Brown-Orange
    textSecondary: '#C2410C', // Burnt Orange
    border: '#FED7AA',
    accent: '#EA580C', // Vivid Orange
    accentSecondary: '#F97316', // Bright Orange
    cardBg: '#FFF7ED',
    error: '#DC2626',
    success: '#15803D',
  },
  lavender: {
    dark: false,
    background: '#F5F3FF', // Light Silk
    backgroundElement: '#EDE9FE', // Lavender Mist
    backgroundSelected: '#DDD6FE', // Deep Lavender
    surface: '#FFFFFF',
    text: '#4C1D95', // Royal Violet
    textSecondary: '#7C3AED', // Soft Violet
    border: '#DDD6FE',
    accent: '#8B5CF6', // Vivid Violet
    accentSecondary: '#A78BFA', // Muted Purple
    cardBg: '#F5F3FF',
    error: '#E11D48',
    success: '#7C3AED',
  },
  chocolate: {
    dark: true,
    background: '#1C1917', // Espresso Black
    backgroundElement: '#292524', // Coffee
    backgroundSelected: '#44403C', // Mocha
    surface: '#292524',
    text: '#FAFAF9', // Creamy White
    textSecondary: '#D6D3D1', // Soft Gray
    border: '#44403C',
    accent: '#A8A29E', // Stone
    accentSecondary: '#78716C', // Warm Gray
    cardBg: '#292524',
    error: '#F87171',
    success: '#A8A29E',
  },
  steel: {
    dark: true,
    background: '#0F172A', // Steel Blue Dark
    backgroundElement: '#1E293B', // Slate
    backgroundSelected: '#334155', // Metallic
    surface: '#1E293B',
    text: '#F8FAFC', // Ice
    textSecondary: '#94A3B8', // Steel Gray
    border: '#334155',
    accent: '#64748B', // Industrial Gray
    accentSecondary: '#475569', // Muted Slate
    cardBg: '#1E293B',
    error: '#EF4444',
    success: '#64748B',
  },
};

// Default mappings for components that might still look for Light/Dark colors
export const LightColors = Themes.minimal;
export const DarkColors = { ...Themes.minimal, dark: true, background: '#0F172A', text: '#F8FAFC' };

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
};
