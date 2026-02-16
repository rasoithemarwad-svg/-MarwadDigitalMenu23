# Project State - Feb 2026

## Backup Contents
This backup contains:
- **Full Source Code:** All web and native app code.
- **Generated APKs:**
    - `Marwad-Delivery-Fix.apk`: **USE THIS** for delivery partners. Contains the location bug fix.
    - `Marwad-Admin-Fresh.apk`: Latest Admin App.
    - `Marwad-Staff-Fresh.apk`: Latest Staff App.

## Citical details
- **Server:** Running on Render (Free Tier).
- **Database:** MongoDB Atlas (Free Tier).
- **API URL:** `https://digital-marwad-1.onrender.com` (Hardcoded in APKs).

## Future Changes
If you switch servers, you must:
1. Buy a custom domain (e.g., `api.marwad.com`).
2. Point it to your new server.
3. Update `marwad-native/constants/Config.js`.
4. Rebuild all APKs.

## How to Restore
1. Unzip the backup file.
2. Open terminal in the folder.
3. Run `npm install` to restore dependencies.
