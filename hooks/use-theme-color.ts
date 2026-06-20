import { useTheme } from './use-theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: 'text' | 'background' | 'tint' | 'icon' | 'tabIconDefault' | 'tabIconSelected'
) {
  const { colors, isDark } = useTheme();
  
  const themeKey = isDark ? 'dark' : 'light';
  const colorFromProps = props[themeKey];

  if (colorFromProps) {
    return colorFromProps;
  }
  
  if (colorName === 'background') return colors.background;
  if (colorName === 'text') return colors.text;
  if (colorName === 'tint' || colorName === 'tabIconSelected') return colors.accent;
  if (colorName === 'icon' || colorName === 'tabIconDefault') return colors.textSecondary;
  
  return colors.border;
}
