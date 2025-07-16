# Authentication Setup Instructions

## 1. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a free account or sign in
3. Create a new cluster (choose the free tier)
4. Once the cluster is ready:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `disputed` (or your preferred database name)

5. Update your `.env.local` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/disputed?retryWrites=true&w=majority
   ```

## 2. NextAuth Secret

Generate a secure secret for NextAuth:

```bash
openssl rand -base64 32
```

Update your `.env.local` file:
```
NEXTAUTH_SECRET=your-generated-secret-here
```

## 3. Google OAuth (Optional)

If you want to enable Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3002/api/auth/callback/google`
5. Copy the Client ID and Client Secret to your `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

## 4. Start the Application

```bash
npm run dev
```

The app will be available at `http://localhost:3002`

## Features

- **User Registration**: Create account with username, email, and password
- **User Login**: Sign in with email/password or Google OAuth
- **Game Statistics**: Track rating, games played, and games won
- **Session Management**: Secure JWT-based sessions
- **Guest Play**: Play without creating an account
- **Modern UI**: Responsive design with Tailwind CSS

## Authentication Flow

1. **Guest Users**: Can play immediately with a temporary name
2. **Registered Users**: 
   - Name is automatically filled from their account
   - Game statistics are tracked and persisted
   - Can view their rating and game history in the top-right corner
3. **Session Security**: 
   - Passwords are hashed with bcryptjs (12 rounds)
   - JWT tokens include custom user fields
   - MongoDB stores user data securely

## Database Schema

The MongoDB collection `users` will automatically be created with this structure:
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  username: String (unique),
  password: String (hashed),
  avatar: String,
  rating: Number (default: 1200),
  gamesPlayed: Number (default: 0),
  gamesWon: Number (default: 0),
  emailVerified: Date,
  image: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Security Features

- Password hashing with bcryptjs
- Input validation with Zod
- CSRF protection via NextAuth
- Secure session cookies
- SQL injection protection via MongoDB
- XSS protection via React
