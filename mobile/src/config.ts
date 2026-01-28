import Constants from "expo-constants";

export const API_BASE_URL = 
  Constants.expoConfig?.extra?.apiBaseUrl || 
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://262e50f1-3284-42c0-9793-2016d4dcb634-00-wn8uok722vqq.picard.replit.dev";
