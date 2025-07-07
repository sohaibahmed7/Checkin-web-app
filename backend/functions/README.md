# CheckIn Backend - Firebase Functions

This is the backend API for the CheckIn web application, deployed as Firebase Functions.

## Environment Variables Required

Add these to your `.env` file in the `functions` directory:

```env
# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string

# Email Configuration (Gmail)
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASSWORD=your_app_password

# Firebase Storage
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:8000,https://your-frontend-domain.com
```

## Firebase Setup

1. **Enable Firebase Storage** in your Firebase project
2. **Set Storage Rules** to allow uploads:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /profile_pictures/{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /ping_photos/{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

## Deployment

```bash
cd backend/functions
npm install
firebase deploy --only functions
```

## API Endpoints

- `POST /api/register` - User registration with profile picture upload
- `POST /api/login` - User login
- `POST /api/verify-email` - Email verification
- `POST /api/pings` - Create ping with photo upload
- `PUT /api/user/settings` - Update user settings with profile picture
- `GET /api/pings` - Get all pings
- `GET /api/user/:id/profile-picture` - Get user profile picture

## File Upload Flow

1. Frontend converts file to base64 using FileReader
2. Frontend sends JSON with base64 data
3. Backend receives base64 data and converts to buffer
4. Backend uploads buffer to Firebase Storage
5. Backend makes file publicly accessible
6. Backend stores the public URL in MongoDB
7. Frontend can access images via the stored URLs 