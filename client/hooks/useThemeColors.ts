import { useAuthStore } from '../store/authStore';
import { useColorScheme } from 'react-native';

export function useThemeColors() {
  const { user } = useAuthStore();
  const systemScheme = useColorScheme();
  
  const activeTheme = user?.theme === 'system' || !user?.theme ? systemScheme : user.theme;
  const isDark = activeTheme === 'dark';

  return {
    isDark,
    theme: activeTheme,
    colors: {
      background: isDark ? '#0F172A' : '#F8FAFC',    // dark slate vs light slate
      card: isDark ? '#1E293B' : '#FFFFFF',          // slate-800 vs white
      text: isDark ? '#F1F5F9' : '#0F172A',          // slate-100 vs slate-900
      textSecondary: isDark ? '#94A3B8' : '#64748B', // slate-400 vs slate-500
      border: isDark ? '#334155' : '#E2E8F0',        // slate-700 vs slate-200
      primary: '#059669',                            // emerald-600
      primaryLight: isDark ? 'rgba(5, 150, 105, 0.15)' : 'rgba(5, 150, 105, 0.05)',
      success: '#10B981',
      danger: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
      inputBg: isDark ? '#0F172A' : '#F8FAFC',       // deep slate vs light slate
      tint: isDark ? '#F1F5F9' : '#059669',
      tabBar: isDark ? '#1E293B' : '#FFFFFF',
      tabBarBorder: isDark ? '#334155' : '#E2E8F0',
    }
  };
}
