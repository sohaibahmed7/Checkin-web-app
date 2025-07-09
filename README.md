# Check-In Web App

A modern, responsive community safety dashboard and reporting app. Built with vanilla JavaScript, Mapbox, and a Firebase Functions + MongoDB backend.

## Features

- Real-time community alerts and notifications
- Interactive neighborhood map with incident tracking
- Community chat and commenting system
- Detailed incident reporting with photo uploads
- User authentication, email verification, and password reset
- User settings and preferences
- Mobile-responsive design

## Project Structure

```
├── backend/
│   ├── functions/           # Firebase Functions backend (API, DB, email, storage)
│   ├── firebase.json        # Firebase config
│   ├── .firebaserc          # Firebase project alias
├── index.html               # Main entry point (frontend)
├── styles.css               # Global styles
├── config.js                # Frontend config (API URLs, tokens)
├── script.js                # Main JS for landing page
├── pages/
│   ├── auth/                # Auth pages (login, register, etc.)
│   ├── info/                # Info pages (contact, features, etc.)
│   ├── neighborhood/        # Neighborhood management
│   ├── moderator/           # Moderator dashboard
│   ├── dashboard/           # Main dashboard (map, chat, etc.)
│   └── assets/              # Static images/assets
├── README.md
├── LICENSE
```

## Setup & Deployment

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/check-in-dashboard.git
cd check-in-dashboard
```

### 2. Configure Firebase Functions Backend
- Go to `backend/functions/`
- Insert `.env` and fill in your secrets (MongoDB URI, email, etc.)
- Install dependencies:
  ```bash
  cd backend/functions
  npm install
  ```
- Deploy to Firebase:
  ```bash
  firebase deploy --only functions
  ```

### 3. Serve the Frontend
- You can open `index.html` directly, or use a local server:
  ```bash
  python -m http.server 8000
  # or
  npx serve
  ```
- Update `config.js` with your deployed Firebase Functions API URL.

### 4. Mapbox Token
- Replace the Mapbox token in `pages/dashboard/scripts/dashboard.js` with your own:
  ```javascript
  mapboxgl.accessToken = 'your-mapbox-token';
  ```

## Technologies Used
- HTML5, CSS3, JavaScript (ES6+)
- Mapbox GL JS
- Firebase Functions (Node.js, Express)
- MongoDB (via Mongoose)
- Nodemailer (email)
- Firebase Storage (for images)
- Font Awesome, Google Fonts (Poppins)

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
