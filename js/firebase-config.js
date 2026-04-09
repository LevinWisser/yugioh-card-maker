// ─── Firebase Project Config ───────────────────────────────────────────────────
// 1. Gehe zu https://console.firebase.google.com → Projekt erstellen
// 2. Project Settings → "Your apps" → Web-App hinzufügen
// 3. Kopiere die Config-Werte hier rein
// 4. Im Firebase-Projekt aktivieren:
//    - Authentication → Sign-in method → Google aktivieren
//    - Firestore Database → erstellen (Production mode)
//    - Firestore Rules ersetzen durch:
//
//      rules_version = '2';
//      service cloud.firestore {
//        match /databases/{database}/documents {
//          match /cards/{userId}/collection/{document=**} {
//            allow read, write: if request.auth != null && request.auth.uid == userId;
//          }
//        }
//      }

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCxozHHElkMWFHJxq4MVHeOVlZG2FQw6F4",
  authDomain:        "yugioh--card-maker.firebaseapp.com",
  projectId:         "yugioh--card-maker",
  storageBucket:     "yugioh--card-maker.firebasestorage.app",
  messagingSenderId: "446383710227",
  appId:             "1:446383710227:web:a4e4425c91888c04c95fe6"
};
