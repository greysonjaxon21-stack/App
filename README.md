# Plately — AI calorie tracker

Snap a photo of your meal and Plately estimates the calories, protein, carbs and fats in seconds.

- **`mobile/`**: the iOS / Android app (Expo + React Native, also runs in a browser)
- **`server/`**: a small API that sends meal photos to Claude for nutrition analysis. It keeps your Anthropic API key off the phone.

## Features

- **Onboarding that builds your plan**: gender, workouts per week, height and weight, age, goal (lose / maintain / gain), target weight and pace. It calculates daily calories (Mifflin-St Jeor BMR × activity, ± a deficit or surplus for your pace) and protein / carb / fat targets, and shows the date you should hit your goal.
- **Scan food**: take a photo or pick one from your library. The AI identifies each item, estimates portions and returns calories, macros, fiber, sugar, sodium and a 1–10 health score.
- **Describe food**: type what you ate ("2 eggs and toast with butter") and get the same breakdown.
- **Manual entry** for when you already know the numbers.
- **Fix results**: tell the AI what's wrong ("it was a large portion", "no cheese") and it re-estimates.
- **Servings** adjuster, and editable calories and macros.
- **Home dashboard**: calories left ring, protein / carbs / fats left rings, a 7-day strip with daily progress rings, your logged meals with photos, and a day streak 🔥.
- **Progress**: log your weight, weight chart against your goal, goal progress %, this week's calories vs goal, and BMI.
- **Settings**: edit your details (goals recalculate), adjust goals by hand, switch imperial / metric, set the server address, reset data.

All your data is stored on the device.

## Quick start

You need Node.js 20+ and an Anthropic API key (https://console.anthropic.com).

### 1. Start the AI server

```bash
cd server
npm install
cp .env.example .env      # then put your key in ANTHROPIC_API_KEY
npm start                 # http://localhost:8787
```

### 2. Run the app on your phone

```bash
cd mobile
npm install
npx expo start
```

Install **Expo Go** from the App Store or Play Store and scan the QR code. Your phone must be on the same Wi-Fi as your computer. In development the app automatically talks to the server on your computer at port 8787. If it can't connect, open **Settings → AI server** in the app and enter `http://<your-computer-ip>:8787`.

To try it in a browser instead, press `w` in the Expo terminal.

## Going to production

1. **Deploy the server** to any Node host (Render, Railway, Fly.io, a VPS…). Set `ANTHROPIC_API_KEY`, and set `APP_TOKEN` to a random string so only your app can use your key. The start command is `npm start`.
2. **Point the app at it**: create `mobile/.env` with
   ```
   EXPO_PUBLIC_API_URL=https://your-server.example.com
   EXPO_PUBLIC_APP_TOKEN=the-same-random-string
   ```
3. **Build the app** with EAS: `npx eas-cli@latest build -p ios` (or `-p android`), then `npx eas-cli@latest submit` to send it to the App Store or Play Store.

## Server configuration

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | (required) | Your Anthropic API key |
| `APP_TOKEN` | (none) | If set, requests must send a matching `X-App-Token` header |
| `PORT` | `8787` | Port to listen on |
| `CLAUDE_MODEL` | `claude-opus-5-5` | Model used for analysis |
| `CLAUDE_EFFORT` | `medium` | `low` is faster and cheaper; `high` is more careful |
| `RATE_LIMIT_PER_MINUTE` | `20` | Requests per minute per IP |

The server uses Claude's structured outputs, so it always returns well-formed JSON. Server-side fallbacks are turned on: if the model declines a request, the API retries it on a fallback model.

### API

`POST /analyze` with JSON `{ imageBase64?, mediaType?, description?, correction?, previous? }` returns `{ analysis: { name, items[], calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, health_score, confidence, notes } }`.

## Development

```bash
cd server && npm test && npm run typecheck
cd mobile && npm test && npm run typecheck
```

Nutrition values are AI estimates, not medical advice.
