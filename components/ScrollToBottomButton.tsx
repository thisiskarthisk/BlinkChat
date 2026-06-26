import { ArrowDown } from "lucide-react-native";
import React, { useEffect } from "react";
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
    
    /* -------------------------------------------------------------
       Props
       ------------------------------------------------------------- */
    type Props = {
      /** Called when the user taps the button – should scroll the list */
      onPress: () => void;
      /** Show/hide flag – the button fades in/out */
      visible: boolean;
    };
    
    /* -------------------------------------------------------------
       Component
       ------------------------------------------------------------- */
    export default function ScrollToBottomButton({ onPress, visible }: Props) {
      const fade = React.useRef(new Animated.Value(0)).current;
    
      // animate opacity whenever visibility changes
      useEffect(() => {
        Animated.timing(fade, {
          toValue: visible ? 1 : 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
      }, [visible]);
    
      // render nothing when hidden – avoids an extra view in the tree
      if (!visible) return null;
    
      return (
        <Animated.View style={[styles.container, { opacity: fade }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            style={styles.btn}
            accessibilityLabel="Scroll to newest message"
          >
            <ArrowDown size={22} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      );
    }
    
    /* -------------------------------------------------------------
       Styles – premium look, subtle shadow, primary brand colour
       ------------------------------------------------------------- */
    const styles = StyleSheet.create({
      container: {
        position: "absolute",
        bottom: 84,                // sits just above the message‑input bar
        right: 16,
        zIndex: 10,
      } as ViewStyle,
      btn: {
        backgroundColor: "#2563EB",
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        // elevation / shadow for a premium feel
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    });
