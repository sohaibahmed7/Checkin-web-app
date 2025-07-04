
## Environment Variables

This project uses environment variables to store sensitive configuration data. Follow these steps to set up your environment:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and fill in your actual values:
   - `MONGODB_URI`: Your MongoDB connection string
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASSWORD`: Your Gmail app password
   - `JWT_SECRET`: A secure random string for JWT tokens

3. Never commit the `.env` file to version control (it's already in .gitignore)

### Required Environment Variables:

- `MONGODB_URI`: MongoDB connection string
- `EMAIL_USER`: Email address for sending notifications
- `EMAIL_PASSWORD`: Email password or app password
- `JWT_SECRET`: Secret key for JWT token signing

### Optional Environment Variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)
- `EMAIL_SERVICE`: Email service provider (default: gmail)
