# Firebase Setup – YuGiOh Card Maker

## Warum Firebase?

Der Card Maker läuft als reine statische Website auf GitHub Pages – kein Server, kein Backend.
Damit Karten trotzdem **benutzerbezogen gespeichert** werden können (sodass du beim nächsten
Besuch weitermachen kannst), brauchen wir:

- **Firebase Authentication** → Google-Login, damit die Karten deinem Account gehört
- **Firestore** → Cloud-Datenbank, in der deine Karten (inkl. komprimiertem Artwork) gespeichert werden

Das Artwork wird direkt als komprimiertes JPEG (max. 800×800) in Firestore abgelegt –
kein separater Datei-Storage nötig.

---

## Was bereits erledigt ist

- [x] Firebase-Projekt erstellt (`yugioh--card-maker`)
- [x] Web-App im Projekt angelegt (App-ID: `1:446383710227:web:...`)
- [x] Config-Werte in `js/firebase-config.js` eingetragen
- [x] Code implementiert:
  - `js/firebase.js` – Firebase-Wrapper (Auth + Firestore)
  - `js/app.js` – Save/Load/Delete-Logik, Auth-UI
  - `index.html` – Login-Button im Header, Save-Button im Footer, "My Cards"-Modal
  - `style.css` – Styles für alle neuen UI-Elemente

---

## Was noch zu tun ist (Firebase Console)

Alles passiert auf **console.firebase.google.com** im Projekt „YuGiOh Card Maker".

---

### Schritt 1 – Google Authentication aktivieren

1. Linke Sidebar → **Build** → **Authentication**
2. Button **"Get started"** klicken
3. Tab **"Sign-in method"**
4. **Google** anklicken → **Enable** (Schalter umlegen)
5. Projekt-Support-E-Mail auswählen (deine Gmail-Adresse)
6. **Save**

---

### Schritt 2 – Firestore-Datenbank erstellen

1. Linke Sidebar → **Build** → **Firestore Database**
2. **"Create database"** klicken
3. Modus: **Production mode** → Next
4. Standort wählen (z.B. `europe-west1`) → **Done**
5. Kurz warten bis die Datenbank bereit ist

---

### Schritt 3 – Firestore-Regeln setzen

Damit nur du deine eigenen Karten lesen/schreiben kannst:

1. In Firestore → Tab **"Rules"**
2. Den gesamten Inhalt ersetzen durch:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cards/{userId}/collection/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. **Publish**

---

### Schritt 4 – GitHub Pages als autorisierte Domain eintragen

Damit der Google-Login auf deiner gehosteten Seite funktioniert:

1. Authentication → Tab **"Settings"**
2. Abschnitt **"Authorized domains"**
3. **"Add domain"** → `levinwisser.github.io` eingeben → **Add**

---

### Schritt 5 – Lokal testen

Bevor du pushst, kurz lokal prüfen:

```
# Im Projektordner, z.B. mit Python:
python -m http.server 8080
# Dann http://localhost:8080 im Browser öffnen
```

Oder in VS Code: **Go Live** (Live Server Extension).

`localhost` ist bereits als autorisierte Domain hinterlegt, der Login sollte direkt funktionieren.

---

### Schritt 6 – Auf GitHub pushen

```
git add .
git commit -m "feat: Firebase save/load integration"
git push
```

Danach ist die Funktion live auf `levinwisser.github.io/yugioh-card-maker`.
