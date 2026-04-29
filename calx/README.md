# 🥗 CalorieLens — AI-Powered Calorie Tracker

A fully offline-capable, mobile-first calorie and macro tracker built with vanilla HTML/CSS/JS. Uses AI vision APIs to scan food from photos.

## ✨ Features

- **First-time setup wizard** — collects name, age, sex, height, weight, goal, activity level
- **Mifflin-St Jeor BMR calculation** with TDEE and macro targets
- **AI food scanning** via OpenAI GPT-4o, Google Gemini 2.0 Flash, or any custom endpoint
- **Manual food entry** with full macro tracking
- **Daily calorie ring** with animated progress visualization
- **Macro progress bars** for protein, fat, and carbs
- **Weight logging** with trend chart
- **Weekly bar chart** of calorie intake vs. goal
- **Streak tracking** for consecutive logging days
- **BMI display** with category indicator
- **5 color schemes** + light/dark mode (Material 3 Expressive)
- **Edit / delete** food log entries
- **All data stored locally** in `localStorage` — no backend, no account
- **PWA-ready** — can be installed on mobile home screen

## 🚀 Deployment on GitHub Pages

### Method 1: Upload directly

1. Create a new GitHub repository (e.g. `calorie-tracker`)
2. Upload all files:
   - `index.html`
   - `style.css`
   - `main.js`
   - `storage.js`
   - `api.js`
   - `ui.js`
   - `manifest.json`
3. Go to **Settings → Pages**
4. Set Source to **Deploy from branch → main → / (root)**
5. Click Save — your app will be live at `https://yourusername.github.io/calorie-tracker/`

### Method 2: Using Git CLI

```bash
git init
git add .
git commit -m "Initial commit: CalorieLens"
gh repo create calorie-tracker --public --push --source=.
# Then enable GitHub Pages in repository Settings
```

## 🔑 API Setup (for AI Food Scanning)

1. Open the app → navigate to **Settings → AI API Settings**
2. Choose your provider:
   - **OpenAI**: Get a key at [platform.openai.com](https://platform.openai.com) — uses GPT-4o vision
   - **Google Gemini**: Get a key at [aistudio.google.com](https://aistudio.google.com) — uses Gemini 2.0 Flash
   - **Custom**: Any OpenAI-compatible endpoint
3. Paste your API key and tap **Save API Settings**

> ⚠️ API keys are stored only in your browser's `localStorage`. They are never sent anywhere except directly to the AI provider's API.

## 📁 File Structure

```
calorie-tracker/
├── index.html      — App shell, navigation, wizard markup
├── style.css       — Material 3 design system, all styling
├── storage.js      — localStorage read/write layer
├── api.js          — AI vision API calls (OpenAI/Gemini/Custom)
├── ui.js           — All page rendering, charts, modals
├── main.js         — App state, navigation, nutrition math, wizard logic
└── manifest.json   — PWA manifest for home screen install
```

## 🧠 Nutrition Calculation

Uses the **Mifflin-St Jeor equation**:

- **BMR** = 10×weight + 6.25×height − 5×age + 5 (male) or −161 (female)
- **TDEE** = BMR × activity multiplier (1.2 to 1.725)
- **Goal adjustment**: Lose −400 kcal · Maintain ±0 · Gain +400 kcal
- **Protein**: 1.8g per kg body weight
- **Fat**: 25% of total calories ÷ 9 kcal/g
- **Carbs**: Remaining calories ÷ 4 kcal/g

## 🗃️ localStorage Keys

| Key | Content |
|-----|---------|
| `ct_userProfile` | Name, age, sex, height, weight, goal, activity, profile photo (base64) |
| `ct_nutritionGoals` | Calculated calories, protein, fat, carbs targets |
| `ct_dailyLogs` | Date-keyed food entries with totals |
| `ct_weightLog` | Array of `{date, weight}` entries |
| `ct_apiSettings` | Provider, API key, custom endpoint |
| `ct_theme` | Color scheme and light/dark mode |
| `ct_streak` | Current and longest logging streak |

## 🏗️ Local Development

No build tools needed — just open `index.html` in a browser:

```bash
# If you have Python installed:
python -m http.server 3000
# Then open http://localhost:3000

# Or with Node.js npx:
npx serve .
```

> Note: The camera capture feature (`capture="environment"`) works best when served over HTTPS or localhost.

## 📱 Install as PWA

On mobile, after opening in Safari (iOS) or Chrome (Android):
- **iOS**: Tap Share → Add to Home Screen
- **Android**: Tap the browser menu → Install App / Add to Home Screen
