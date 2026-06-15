// import React, { useEffect, useRef } from 'react';
// import {
//   Animated,
//   Dimensions,
//   StyleSheet,
//   Text,
//   View,
// } from 'react-native';

// const { width, height } = Dimensions.get('window');

// interface AnimatedSplashOverlayProps {
//     onAnimationComplete?: () => void;
// }

// export default function AnimatedSplashOverlay({ onAnimationComplete }: AnimatedSplashOverlayProps) {
//   const logoScale   = useRef(new Animated.Value(0.6)).current;
//   const logoOpacity = useRef(new Animated.Value(0)).current;
//   const tagOpacity  = useRef(new Animated.Value(0)).current;
//   const dotAnim     = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.sequence([
//       // Logo pop-in
//       Animated.parallel([
//         Animated.spring(logoScale, {
//           toValue: 1,
//           tension: 60,
//           friction: 7,
//           useNativeDriver: true,
//         }),
//         Animated.timing(logoOpacity, {
//           toValue: 1,
//           duration: 500,
//           useNativeDriver: true,
//         }),
//       ]),
//       // Tagline fade
//       Animated.timing(tagOpacity, {
//         toValue: 1,
//         duration: 400,
//         delay: 100,
//         useNativeDriver: true,
//       }),
//       // Loading dots pulse
//       Animated.loop(
//         Animated.sequence([
//           Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
//           Animated.timing(dotAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
//         ]),
//         { iterations: 2 }
//       ),
//     ]).start(() => {
//         if (onAnimationComplete) {
//             onAnimationComplete();
//         }
//     });
//   }, []);

//   return (
//     <View style={styles.container}>
//       {/* Decorative circles */}
//       <View style={[styles.blob, styles.blobTopRight]} />
//       <View style={[styles.blob, styles.blobBottomLeft]} />

//       {/* Dot grid texture overlay */}
//       <View style={styles.dotGridOverlay} pointerEvents="none" />

//       {/* Logo lockup */}
//       <Animated.View
//         style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
//       >
//         {/* Logo Image */}
//         <View style={styles.logoCircle}>
//              <Text style={{ fontSize: 60 }}>💬</Text>
//         </View>

//         <Text style={styles.brandName}>BlinkChat</Text>
//         <View style={styles.accentUnderline} />
//       </Animated.View>

//       {/* Tagline */}
//       <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
//         Fast. Simple. Secure.{"\n"}Connecting you instantly.
//       </Animated.Text>

//       {/* Loading indicator */}
//       <Animated.View style={[styles.loadingRow, { opacity: tagOpacity }]}>
//         {[0, 1, 2].map(i => (
//           <Animated.View
//             key={i}
//             style={[
//               styles.loadingDot,
//               {
//                 opacity: dotAnim.interpolate({
//                   inputRange: [0, 1],
//                   outputRange: [0.3, i === 1 ? 1 : 0.6],
//                 }),
//                 transform: [
//                   {
//                     scale: dotAnim.interpolate({
//                       inputRange: [0, 1],
//                       outputRange: [0.8, i === 1 ? 1.3 : 1],
//                     }),
//                   },
//                 ],
//               },
//             ]}
//           />
//         ))}
//       </Animated.View>

//       {/* Bottom wordmark */}
//       <Text style={styles.bottomText}>Your Privacy, Our Priority 🌿</Text>
//     </View>
//   );
// }

// const CREAM    = '#FDF6ED';
// const TERRA    = '#2563EB'; // Changed to Blue to match BlinkChat
// const SAFFRON  = '#60A5FA'; // Changed to Lighter Blue
// const SAGE     = '#64748B';

// const styles = StyleSheet.create({
//   container: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: CREAM,
//     alignItems: 'center',
//     justifyContent: 'center',
//     zIndex: 9999,
//   },

//   // Decorative blobs
//   blob: {
//     position: 'absolute',
//     borderRadius: 9999,
//   },
//   blobTopRight: {
//     width: 280,
//     height: 280,
//     top: -80,
//     right: -80,
//     backgroundColor: SAFFRON + '22',
//   },
//   blobBottomLeft: {
//     width: 220,
//     height: 220,
//     bottom: -60,
//     left: -60,
//     backgroundColor: TERRA + '18',
//   },

//   dotGridOverlay: {
//     ...StyleSheet.absoluteFillObject,
//   },

//   // Logo area
//   logoWrap: {
//     alignItems: 'center',
//     marginBottom: 28,
//   },
//   logoCircle: {
//     width: 120,
//     height: 120,
//     borderRadius: 60,
//     backgroundColor: TERRA,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 20,
//     shadowColor: TERRA,
//     shadowOffset: { width: 0, height: 12 },
//     shadowOpacity: 0.4,
//     shadowRadius: 24,
//     elevation: 15,
//     overflow: 'hidden',
//   },
//   logoImage: {
//     width: 80,
//     height: 80,
//   },
//   brandName: {
//     fontSize: 42,
//     fontWeight: '800',
//     color: '#1E293B',
//     letterSpacing: -1,
//   },
//   accentUnderline: {
//     marginTop: 8,
//     width: 64,
//     height: 4,
//     borderRadius: 2,
//     backgroundColor: TERRA,
//   },

//   tagline: {
//     fontSize: 16,
//     color: SAGE,
//     textAlign: 'center',
//     paddingHorizontal: 40,
//     lineHeight: 24,
//     marginBottom: 40,
//     fontWeight: '500',
//   },

//   // Loading dots
//   loadingRow: {
//     flexDirection: 'row',
//     gap: 10,
//     marginBottom: 60,
//   },
//   loadingDot: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     backgroundColor: TERRA,
//   },

//   bottomText: {
//     position: 'absolute',
//     bottom: 50,
//     fontSize: 13,
//     color: SAGE,
//     fontWeight: '600',
//     letterSpacing: 0.5,
//   },
// });



import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircleMore } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashOverlayProps {
  onAnimationComplete?: () => void;
}

export default function AnimatedSplashOverlay({
  onAnimationComplete,
}: AnimatedSplashOverlayProps) {
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Floating particles
    const createFloatingAnimation = (
      value: Animated.Value,
      duration: number,
    ) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    createFloatingAnimation(particle1, 3000);
    createFloatingAnimation(particle2, 4000);
    createFloatingAnimation(particle3, 5000);

    // Rotating ring
    Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Loading dots
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Main entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      onAnimationComplete?.();
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  const spin = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#0F172A', '#1E3A8A', '#2563EB']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Floating Particles */}

      <Animated.View
        style={[
          styles.particle,
          {
            top: 120,
            left: 40,
            transform: [
              {
                translateY: particle1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-15, 15],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.particleLarge,
          {
            top: 200,
            right: 50,
            transform: [
              {
                translateY: particle2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [15, -15],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.particle,
          {
            bottom: 180,
            left: width * 0.25,
            transform: [
              {
                translateY: particle3.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 20],
                }),
              },
            ],
          },
        ]}
      />

      {/* Logo Section */}

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glowRing,
            {
              transform: [{ rotate: spin }],
            },
          ]}
        />

        <View style={styles.logoCircle}>
         <MessageCircleMore size={80} color={'#2563EB'}  />
        </View>
      </Animated.View>

      {/* App Name */}

      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
          },
        ]}
      >
        <Text style={styles.brand}>BlinkChat</Text>

        <Text style={styles.tagline}>
          Fast • Secure • Instant Messaging
        </Text>
      </Animated.View>

      {/* Loading Dots */}

      <View style={styles.loadingRow}>
        {[0, 1, 2].map(index => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                opacity: dotAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    0.3,
                    index === 1 ? 1 : 0.7,
                  ],
                }),
                transform: [
                  {
                    scale: dotAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        0.8,
                        index === 1 ? 1.4 : 1.1,
                      ],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* Footer */}

      <Animated.Text
        style={[
          styles.footer,
          {
            opacity: textOpacity,
          },
        ]}
      >
        Your Privacy, Our Priority 🔒
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  particle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  particleLarge: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  logoContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },

  glowRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#60A5FA',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 20,
  },

  // logoLetter: {
  //   fontSize: 60,
  //   fontWeight: '900',
  //   color: '#2563EB',
  // },

  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },

  brand: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },

  tagline: {
    marginTop: 10,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },

  loadingRow: {
    flexDirection: 'row',
    marginTop: 50,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
  },

  footer: {
    position: 'absolute',
    bottom: 50,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    letterSpacing: 1,
    fontWeight: '600',
  },
});