// 
import { router } from 'expo-router'
import React, { useEffect } from 'react'
import AnimatedSplashOverlay from '../components/AnimatedSplashOverlay'
import { useAuth } from '@/hooks/useAuth'
import { Platform } from 'react-native'

export default function Index() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Immediately route on web or if already logged in to avoid splash delays
    if (Platform.OS === 'web' || session) {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    } else {
      // Entry screen on mobile
      const timer = setTimeout(() => {
        router.replace(session ? '/(tabs)' : '/(auth)/login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [session, loading]);

  return <AnimatedSplashOverlay />;
}