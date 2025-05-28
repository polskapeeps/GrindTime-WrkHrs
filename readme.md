# Daily Grind - Personal Hours Tracker

Just a simple web app I built to track my work hours and calculate earnings. Got tired of using spreadsheets and wanted something that syncs across my devices.

## What it does

- **Track work sessions** - Log your start/end times, add notes about what you worked on
- **Calculate pay automatically** - Set your hourly rate and it does the math for you
- **Week view by default** - Opens showing current week (Monday-Sunday) so you can see your weekly progress
- **Filter by date range** - Look at specific time periods or export just what you need
- **Export to CSV** - Download your hours for invoicing, taxes, whatever
- **Works offline** - Built as a PWA so it loads even without internet
- **Syncs everywhere** - Sign in with email/password and your data follows you to any device
- **Dark theme** - Easy on the eyes during those late work sessions

## How to use it

1. **Sign up** with your email and a password (or sign in if you already have an account)
2. **Set your hourly rate** in the settings up top - this gets saved to your account
3. **Add time entries** - pick the date, start time, end time, and optionally describe what you worked on
4. **View your hours** - by default it shows the current week, but you can filter to any date range
5. **Export when needed** - hit the export button to download a CSV of your filtered hours

The app handles overnight shifts correctly (like 11 PM to 3 AM) and keeps everything synced in real-time through Firebase.

## Running it locally

If you want to tinker with the code:

```bash
git clone https://github.com/polskapeeps/Hours-Tracker.git
cd Hours-Tracker
npm install
npm run dev
```

It'll start up on `http://localhost:5173`. The app uses Vite for the build system and Firebase for the backend.

## Tech stuff

Built with vanilla JavaScript, HTML, and CSS - no fancy frameworks. Uses:

- **Firebase** for user auth and real-time database
- **Vite** for development and building
- **Service Worker** for offline functionality and PWA features
- **GitHub Pages** for hosting

Everything is stored in your personal Firebase account, so only you can see your data after logging in.

## Live version

The app is live at: https://polskapeeps.github.io/GrindTime-WrkHrs/

You can install it to your phone's home screen - it works just like a native app.

## License

MIT License - use it however you want. See the LICENSE file for details.

---

_Just a weekend project that turned out pretty useful. Feel free to fork it or suggest improvements!_
