# Firebase setup for Voice Viva

Everything here is on Firebase's free plan (Spark). No card is needed. Total time: about five minutes.

Console: https://console.firebase.google.com

## What the app uses

| Firebase product | Used for | Needed? |
|---|---|---|
| Authentication | Sign in with email and password | Yes |
| Firestore Database | Saving each trainee's attempts | Yes |
| Google Analytics | Nothing | No |
| Hosting, Storage, Functions | Nothing | No |

## Step 1: create the project

1. Console → **Add project** (or **Create a project**).
2. **Project name:** anything, for example `voice-viva`.
3. **Google Analytics:** switch it off. If you leave it on, the next screen asks for an "Analytics location"; any choice is fine, the app never uses it.
4. Click **Create project**, wait, then **Continue**.

## Step 2: turn on email sign-in

Without this nobody can sign in or sign up.

1. Left menu → **Build → Authentication**.
2. Click **Get started**.
3. Tab **Sign-in method** → **Email/Password**.
4. Switch **Enable** on. Leave "Email link (passwordless sign-in)" off.
5. Click **Save**.

## Step 3: create the database

Without this attempts cannot be saved.

1. Left menu → **Build → Firestore Database**.
2. Click **Create database**.
3. **Edition:** Standard, if asked.
4. **Database ID:** leave as `(default)`. The app only works with the default database.
5. **Location:** the one nearest you, for example `eur3 (Europe)`. This cannot be changed later, but any location works.
6. **Security rules:** choose **Start in production mode**.
7. Click **Create** (or **Enable**).

## Step 4: publish the privacy rules

These rules make every attempt readable and writable only by the trainee who owns it. Until they are published, the app cannot save anything.

1. In **Firestore Database**, open the **Rules** tab.
2. Delete everything in the editor and paste this (the same text as `firestore.rules` in the repo root):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/attempts/{attemptId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

3. Click **Publish**.

## Step 5: register a web app and copy its settings

1. Gear icon (top left) → **Project settings**.
2. Scroll to **Your apps** → click the web icon `</>`.
3. **App nickname:** anything, for example `voice-viva-web`. Leave "Firebase Hosting" unticked.
4. Click **Register app**. A `firebaseConfig` block appears.
5. Open the file `.env.local` in the project root and set these lines. Do not paste the values into chat and do not commit this file (git already ignores it).

| Line in `.env.local` | Value to copy from `firebaseConfig` |
|---|---|
| `VITE_FIREBASE_API_KEY=` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN=` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID=` | `projectId` |
| `VITE_FIREBASE_APP_ID=` | `appId` |
| `FIREBASE_PROJECT_ID=` | `projectId` again (same value) |

Not needed from that block: `storageBucket`, `messagingSenderId`, `measurementId`.

The file also needs one line that is not from Firebase:

| Line in `.env.local` | Value |
|---|---|
| `ANTHROPIC_API_KEY=` | Your Anthropic API key |

Optional lines (the app has defaults):

| Line | Default | Purpose |
|---|---|---|
| `VIVA_TURN_MODEL=` | `claude-haiku-5-5` | Model for live turns |
| `VIVA_REVISION_MODEL=` | `claude-opus-5-5` | Model for the revision point |
| `VIVA_CASE_PATH=` | the case JSON in `docs/requirements/` | Case file the app reads |

Why the project id appears twice: lines starting with `VITE_` are sent to the browser; the plain `FIREBASE_PROJECT_ID` is read only by the server, which uses it to check that a sign-in token really belongs to this project.

## Step 6: check it works

Run in the project root:

```
pnpm check:privacy
```

- **What it does:** creates two throwaway test accounts, saves an attempt as the first, and confirms the second account and a signed-out visitor both get "permission denied" when reading it.
- **Expected:** four lines ending in PASS.
- **Side effect:** the two test accounts (`viva-check-…@example.com`) stay in Authentication → Users. Delete them there if you want; they are harmless.

## If something fails

| What you see | Cause | Fix |
|---|---|---|
| Sign-up fails with `OPERATION_NOT_ALLOWED` | Email/Password not enabled | Step 2 |
| Privacy check stops at the first write with 403 | Rules not published | Step 4 |
| Privacy check fails with 404 | Database not created, or not the `(default)` one | Step 3 |
| Server replies "unauthenticated" for a signed-in user | `FIREBASE_PROJECT_ID` differs from `VITE_FIREBASE_PROJECT_ID` | Step 5 |
| Sign-in page shows `auth/invalid-api-key` | Wrong `VITE_FIREBASE_API_KEY`, or the dev server was not restarted | Step 5, then restart `pnpm dev` |

After changing `.env.local`, stop and restart `pnpm dev`.
