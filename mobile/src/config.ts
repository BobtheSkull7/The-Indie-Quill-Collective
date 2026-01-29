import Constants from "expo-constants";

// The Unified Production Backend
const COLLECTIVE_BACKEND_URL = "https://the-indie-quill-collective.onrender.com";

export const API_BASE_URL = 
  process.env.EXPO_PUBLIC_API_BASE_URL || 
  Constants.expoConfig?.extra?.apiBaseUrl || 
  COLLECTIVE_BACKEND_URL;

console.log("Indie Quill Architecture: Unified Production Lock Active");
