# GlowAI

An intelligent skin health tracking application powered by AI that helps users monitor acne, manage skincare routines, and track dietary factors affecting skin health.

## Overview

GlowAI is a mobile-first application built with React Native and Expo that combines computer vision, AI analysis, and health tracking to provide personalized skincare insights. The app leverages Google's Generative AI to analyze skin conditions, recommend treatments, and help users maintain healthy skin through routine tracking and data analysis.

## Features

### Core Features

- **Acne Detection & Tracking**: Use your device camera to capture skin images and receive AI-powered analysis of acne conditions
- **Skin Check Screen**: Regular skin health assessments to monitor changes over time
- **Breakout History**: Visual timeline of skin breakouts and patterns
- **Daily Skin Ritual**: Track your daily skincare routines and habits
- **Treatment Recommendations**: Get AI-powered suggestions for acne and skin health management
- **Safety Warnings**: Important alerts about skin conditions and treatments

### Food & Health Tracking

- **Food Logging**: Photograph and log meals that may affect skin health
- **Food History**: View dietary patterns and their correlation with skin conditions
- **Detailed Food Logging**: Track specific nutritional information and ingredients

### User Management

- **Account Login**: Secure authentication for user accounts
- **Account Setup**: Onboarding process for new users
- **Skin Profile Setup**: Personalized profile creation based on skin type and concerns
- **User Settings**: Manage app preferences and personal information

### Additional Features

- **Acne Tracking History**: Long-term tracking and visualization of skin health progress
- **Routine Lab Builder**: Create custom skincare routines based on recommendations
- **Radial Menu**: Intuitive navigation interface for quick access to features
- **Theme Support**: Dark mode and light mode support for comfortable viewing

## Tech Stack

### Frontend
- **React Native** (v0.81.5) - Native cross-platform development
- **Expo** (v54.0.29) - Development platform and managed services
- **Expo Router** (v6.0.19) - File-based routing
- **React** (v19.1.0) - UI framework
- **React Native Reanimated** (v4.1.1) - Smooth animations and gestures

### UI & Visualization
- **React Native Charts Kit** (v6.12.0) - Data visualization and charts
- **Lucide React Native** (v0.562.0) - Icon library
- **Moti** (v0.30.0) - Animation library
- **Expo Linear Gradient** - Gradient backgrounds
- **React Native Gesture Handler** - Touch interactions

### Backend & AI
- **Firebase** (v12.6.0) - Backend, authentication, and real-time database
- **Google Generative AI** (v0.24.1) - AI-powered image analysis and recommendations

### Device Features
- **Expo Image Picker** - Camera and photo library access
- **Expo File System** - Local file management
- **Expo Haptics** - Haptic feedback
- **Expo Constants** - Device and app constants

### State Management & Storage
- **React Native AsyncStorage** - Local data persistence
- **React Context API** - Global state management

### Development Tools
- **TypeScript** (v5.9.2) - Type-safe JavaScript
- **ESLint** (v9.25.0) - Code quality and linting

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Expo CLI: `npm install -g expo-cli`
- A Firebase project (for backend services)
- Google Generative AI API key (for AI features)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd first-prototype
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Update `FirebaseConfig.ts` with your Firebase project credentials

4. Configure Google Generative AI:
   - Add your API key to the appropriate configuration file

5. Start the development server:
   ```bash
   npm start
   ```

### Running the App

Development with Expo Go (easiest):
```bash
npx expo start
```

For platform-specific development:

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

**Web:**
```bash
npm run web
```

## Project Structure

```
GlowAI/
├── app/                          # Main application screens
│   ├── (tabs)/                   # Tabbed navigation screens
│   │   ├── Home.tsx              # Home dashboard
│   │   ├── quick-actions.tsx     # Quick action shortcuts
│   │   └── UserSetting.tsx       # User settings
│   ├── components/               # Reusable components
│   │   └── RadialMenu.tsx        # Radial navigation menu
│   ├── theme/                    # Theming
│   │   └── ThemeContext.tsx      # Theme provider and context
│   ├── AcneCamera.tsx            # Camera screen for acne detection
│   ├── AcneDetectionResults.tsx  # AI analysis results
│   ├── AcneTracking.tsx          # Acne tracking interface
│   ├── AcneTrackingHistory.tsx   # Historical acne data
│   ├── BreakoutHistory.tsx       # Breakout timeline
│   ├── DailySkinRitual.tsx       # Daily routine tracking
│   ├── FoodHistory.tsx           # Food log history
│   ├── FoodLogDetail.tsx         # Detailed food entries
│   ├── FoodPhotoCapture.tsx      # Food photo capture
│   ├── SkinCheckScreen.tsx       # Skin health assessment
│   ├── SkinHub.tsx               # Main skin health hub
│   ├── SkinProfileSetup.tsx      # Initial profile setup
│   ├── TreatmentRecommendations.tsx # AI treatment suggestions
│   └── _layout.tsx               # Root layout with routing
├── assets/                       # Static assets
│   └── images/                   # App icons and splash screens
├── FirebaseConfig.ts             # Firebase configuration
├── app.json                      # Expo configuration
├── metro.config.js               # Metro bundler configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Project dependencies
```

## Development

### Running Linter

```bash
npm run lint
```

### Reset Project

To create a fresh start with a blank app directory:

```bash
npm run reset-project
```

This moves existing code to `app-example` and creates a new blank `app` directory.

## Key Concepts

### File-Based Routing
This project uses Expo Router's file-based routing system. Screens are organized in the `app` directory, and the file structure automatically generates the app's navigation structure.

### AI-Powered Analysis
The app uses Google's Generative AI to analyze:
- Skin condition images from the camera
- Acne severity and location
- Personalized treatment recommendations
- Correlation between diet and skin health

### Theme System
The app supports both light and dark modes through the React Context API. Themes can be customized in the `ThemeContext.tsx` file.

## Deployment

For production builds and deployment:

1. **Expo Cloud Build**: Use Expo's cloud build service
2. **Google Play Store**: For Android distribution
3. **Apple App Store**: For iOS distribution

Refer to [Expo Build Documentation](https://docs.expo.dev/build/introduction/) for detailed instructions.

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Generative AI Documentation](https://ai.google.dev/)

## Support

For issues, feature requests, or questions, please create an issue in the repository or contact the development team.