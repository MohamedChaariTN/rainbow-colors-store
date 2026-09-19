# Rainbow Colors Mobile

Production mobile application for Rainbow Colors, built with Expo SDK 57 and Expo Router.

## API

The app uses the existing Rainbow Colors backend:

https://rainbow-colors-store.onrender.com/api

The app never stores payment secrets. Card/E-Dinar payments are initiated by the backend and the returned Konnect hosted payment page is opened on the device.

## Local development

    cd mobile
    npm install
    npx expo start

## EAS

    eas build -p all --profile production

Production builds are intended for Google Play and the Apple App Store. Review the privacy policy and store metadata before submission.
