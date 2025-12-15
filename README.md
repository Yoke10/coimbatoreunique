# Rotaract Club Website - Setup Instructions

## Prerequisites
Before running this project, ensure you have Node.js and npm installed on your system.

## Installation Steps

1. **Navigate to the project directory:**
   ```bash
   cd C:\Users\Asus\.gemini\antigravity\scratch\rotaract-club-website
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Firebase (Optional for now):**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication, Firestore, and Storage
   - Copy your Firebase configuration
   - Update `src/firebase/config.js` with your credentials

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   The application will automatically open at `http://localhost:3000`

## Project Structure

```
rotaract-club-website/
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── home/
│   │       ├── HeroSection.jsx
│   │       ├── AnnouncementTicker.jsx
│   │       ├── AboutUsSection.jsx
│   │       ├── PrayerAndTestSection.jsx
│   │       ├── OurTeamSection.jsx
│   │       ├── ClubStatsSection.jsx
│   │       ├── EventsSection.jsx
│   │       ├── SponsorsSection.jsx
│   │       ├── JoinUsSection.jsx
│   │       └── GetInTouchSection.jsx
│   ├── pages/
│   │   └── Home.jsx
│   ├── firebase/
│   │   └── config.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

## Features Implemented

### Home Page Sections:
1. **Hero Section** - Club name with interactive floating "Join Us" button (game-like behavior)
2. **Announcement Ticker** - Scrolling news with pause-on-hover
3. **About Us** - Club information with 3D hover effect on image
4. **Prayer & Four Way Test** - Two cards displaying Rotaract values
5. **Our Team** - Horizontal scrolling team member cards with hover messages
6. **Club Stats** - Animated statistics counters
7. **Events** - Split-design event cards with horizontal scrolling
8. **Sponsors** - Continuous scrolling sponsor logos
9. **Join Us** - Benefits of joining with illustration
10. **Get In Touch** - Contact information cards

### Navigation:
- Responsive header with dropdown menu for Activities
- Mobile-friendly navigation
- Footer with social media links and quick links

## Color Palette
- Primary Purple: #400763
- Primary Pink: #ed0775
- Primary Magenta: #680b56

## Next Steps
- Add actual images (logo, team photos, event images)
- Configure Firebase for backend functionality
- Create additional pages (About, Team, Events, Gallery, etc.)
- Implement Member Space with authentication
- Add FAQ and Terms & Conditions pages
=======
# Unique_website
This is the club website of Rotaract club of Coimbatore Unique
>>>>>>> 53986a985115570397052a0edb00fad2346fdebc
