// 
import { router } from 'expo-router'
import { useEffect } from 'react'
import AnimatedSplashOverlay from '../components/AnimatedSplashOverlay'

export default function Index() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(tabs)')
    }, 3000) // Balanced delay for professional entry

    return () => clearTimeout(timer)
  }, [])

  return <AnimatedSplashOverlay />
}