import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your Firebase configuration (SAFE to expose)
const firebaseConfig = {
  apiKey: "AIzaSyBqqIT6bf2RGBXilc0hv1PYOXhc1anZ0ow",
  authDomain: "ai-ml-e-commerce-platform.firebaseapp.com",
  projectId: "ai-ml-e-commerce-platform",
  appId: "1:617739994903:web:2d7002f90f0e49d3f2d952",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Auth
export const auth = getAuth(app);
