import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Helper utilities for ArrayBuffer and Base64 conversion
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if the current device/browser supports biometric authentication.
 */
export async function isBiometricsSupported(): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || !navigator.credentials || typeof PublicKeyCredential === "undefined") {
      return false;
    }
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  } else {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }
}

/**
 * Register a new biometric credential for the user (Web/PWA only).
 * This binds the user's FaceID/TouchID/Windows Hello to the browser origin.
 */
export async function registerWebBiometrics(userId: string, email: string, name: string): Promise<boolean> {
  if (Platform.OS !== "web") return false;

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: "BlinkChat",
        id: window.location.hostname,
      },
      user: {
        id: Uint8Array.from(userId, c => c.charCodeAt(0)),
        name: email,
        displayName: name,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Force FaceID/TouchID/Windows Hello
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none",
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential;

    if (credential && credential.rawId) {
      const base64Id = arrayBufferToBase64(credential.rawId);
      await AsyncStorage.setItem(`web_biometrics_credential_id_${userId}`, base64Id);
      return true;
    }
    return false;
  } catch (err) {
    console.error("registerWebBiometrics error:", err);
    throw err;
  }
}

/**
 * Authenticate the user using biometrics (FaceID/TouchID/Windows Hello).
 * - Web: Uses the registered WebAuthn credential assertion.
 * - Native: Uses expo-local-authentication.
 */
export async function authenticateBiometrics(
  userId: string,
  promptMessage: string = "Verify your identity"
): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === "web") {
    try {
      const savedCredentialId = await AsyncStorage.getItem(`web_biometrics_credential_id_${userId}`);
      if (!savedCredentialId) {
        return { success: false, error: "No biometric credential registered." };
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        allowCredentials: [
          {
            id: base64ToArrayBuffer(savedCredentialId),
            type: "public-key",
          },
        ],
        userVerification: "required",
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      if (assertion) {
        return { success: true };
      }
      return { success: false, error: "Authentication failed." };
    } catch (err: any) {
      console.error("authenticateBiometrics web error:", err);
      return { success: false, error: err.message || "Biometric authentication failed." };
    }
  } else {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: "Use PIN",
      });
      return { success: res.success, error: res.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
