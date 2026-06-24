import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function AnimatedSplashOverlay() {
  const router = useRouter();

  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const dotAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo pop-in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Tagline fade
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
      }),
      // Loading dots pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      ),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Decorative circles */}
      <View style={[styles.blob, styles.blobTopRight]} />
      <View style={[styles.blob, styles.blobBottomLeft]} />

      {/* Dot grid texture overlay */}
      <View style={styles.dotGridOverlay} pointerEvents="none" />

      {/* Logo lockup */}
      <Animated.View
        style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      >
        {/* Logo Image */}
        <View style={styles.logoCircle}>
          {/* <Image 
            source={require('../../assets/images/app-logo/icon4.png')} 
            style={styles.logoImage}
            contentFit="contain"
          /> */}
        </View>

        <Text style={styles.brandName}>CookuBuddy</Text>
        <View style={styles.accentUnderline} />
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
        {"Every dish has a story. Let's cook yours."}
      </Animated.Text>

      {/* Loading indicator */}
      <Animated.View style={[styles.loadingRow, { opacity: tagOpacity }]}>
        {[0, 1, 2].map(i => (
          <Animated.View
            key={i}
            style={[
              styles.loadingDot,
              {
                opacity: dotAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, i === 1 ? 1 : 0.6],
                }),
                transform: [
                  {
                    scale: dotAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, i === 1 ? 1.3 : 1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Bottom wordmark */}
      <Text style={styles.bottomText}>{"From Anthropic's kitchen 🌿"}</Text>
    </View>
  );
}

const CREAM    = '#FDF6ED';
const TERRA    = '#C1440E';
const SAFFRON  = '#E8A020';
const SAGE     = '#6B7C5C';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Decorative blobs
  blob: {
    position: 'absolute',
    borderRadius: 9999,
  },
  blobTopRight: {
    width: 280,
    height: 280,
    top: -80,
    right: -80,
    backgroundColor: SAFFRON + '22',
  },
  blobBottomLeft: {
    width: 220,
    height: 220,
    bottom: -60,
    left: -60,
    backgroundColor: TERRA + '18',
  },

  dotGridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  // Logo area
  logoWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: TERRA,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: TERRA,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 15,
    overflow: 'hidden',
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  brandName: {
    fontFamily: 'Georgia',
    fontSize: 38,
    fontWeight: '700',
    color: '#2C1A0E',
    letterSpacing: 1,
  },
  accentUnderline: {
    marginTop: 8,
    width: 64,
    height: 3,
    borderRadius: 2,
    backgroundColor: TERRA,
  },

  tagline: {
    fontFamily: 'Georgia',
    fontSize: 15,
    color: SAGE,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
    marginBottom: 40,
    fontStyle: 'italic',
  },

  // Loading dots
  loadingRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 60,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TERRA,
  },

  bottomText: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: SAGE,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
  },
});