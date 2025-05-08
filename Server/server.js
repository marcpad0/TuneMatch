// =====================
// Imports & Initial Setup
// =====================
const express = require('express');
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const TwitchStrategy = require('passport-twitch-new').Strategy; // Updated to Twitch
const GoogleStrategy = require('passport-google-oauth20').Strategy; // Import Google Strategy
const session = require('express-session');
const cors = require('cors');
const { swaggerUi, swaggerDocs } = require('./swagger');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('ws'); // WebSocket server
const path = require('path');
const jwt = require('jsonwebtoken'); // Add JWT library
const cookieParser = require('cookie-parser');
const axios = require('axios'); // For making HTTP requests to Deezer API

// Load environment variables
dotenv.config();

// Select Database Implementation
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';
const db = USE_MOCK_DB ? require('./dbmock') : require('./db');

const app = express();
const port = process.env.PORT || 3000;

// =====================
// Configuration Variables
// =====================
const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_CALLBACK_URL,
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TWITCH_CALLBACK_URL,
  GOOGLE_CLIENT_ID,          
  GOOGLE_CLIENT_SECRET,      
  GOOGLE_CALLBACK_URL,       
  SESSION_SECRET,
  FRONTEND_CALLBACK_URL,
  JWT_SECRET = "tunematch_jwt_secret_key" // Add JWT secret with default
} = process.env;

// Validate Spotify Credentials
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_CALLBACK_URL) {
  console.error('Spotify credentials not set in .env file!');
  process.exit(1);
}

// Validate Twitch Credentials
if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !TWITCH_CALLBACK_URL) {
  console.error('Twitch credentials not set in .env file!');
  process.exit(1);
}

// Validate Google Credentials
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  console.error('Google credentials not set in .env file!');
  process.exit(1);
}

console.log('Spotify Client ID:', SPOTIFY_CLIENT_ID);
console.log('Spotify Callback URL:', SPOTIFY_CALLBACK_URL);
console.log('Twitch Client ID:', TWITCH_CLIENT_ID);
console.log('Twitch Callback URL:', TWITCH_CALLBACK_URL);
console.log('Google Client ID:', GOOGLE_CLIENT_ID); 
console.log('Google Callback URL:', GOOGLE_CALLBACK_URL); 

// =====================
// Middleware Configuration
// =====================
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));
app.use(cookieParser());

app.use(cors({
  origin: ['http://localhost:8080'],
  credentials: true,
}));

app.set('trust proxy', 1);

app.use(session({
  secret: SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // not using HTTPS
    httpOnly: true,
    sameSite: 'lax', // allow limited cross-origin behavior
    maxAge: 24 * 60 * 60 * 1000,
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// =====================
// Deezer API Integration
// =====================
const DEEZER_API_BASE_URL = 'https://api.deezer.com/';

// =====================
// Passport Serialization
// =====================
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  console.log('Deserializing user with ID:', id);
  try {
    const user = await db.getUserById(id);
    if (!user) {
      return done(null, false); // or done(new Error("No user found"), null);
    }
    done(null, user);
  } catch (err) {
    console.error('Error in deserializeUser:', err);
    done(err, null);
  }
});

// =====================
// Passport Spotify Strategy
// =====================
passport.use(new SpotifyStrategy(
  {
    clientID: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET,
    callbackURL: SPOTIFY_CALLBACK_URL,
    passReqToCallback: true,
  },
  async function (req, accessToken, refreshToken, expires_in, profile, done) {
    console.log('Spotify Strategy Callback Invoked');
    console.log('Access Token:', accessToken);
    const emailSpotify = (profile.emails && profile.emails[0]) ? profile.emails[0].value : '';

    try {
      // Handle token database operations
      await db.setSpotifyTokenForUser(emailSpotify, accessToken);

      // Check/Create user
      let user = await db.getUserByEmailSpotify(emailSpotify);
      if (!user) {
        const username = profile.username || profile.displayName || `spotify_${Date.now()}`;
        const newUserId = await db.createUser({
          Username: username,
          emailSpotify,
          emailTwitch: '',
          emailGoogle: '',
          Position: '',
          Password: '',
          DateBorn: ''
        });
        user = await db.getUserById(newUserId);
      }

      return done(null, {
        id: user.id,
        Username: user.Username,
        emailSpotify: user.emailSpotify,
        emailTwitch: user.emailTwitch,
        emailGoogle: user.emailGoogle,
        isAdmin: user.isAdmin
      });
    } catch (err) {
      console.error('Error in Spotify Strategy:', err);
      return done(new Error('Failed to fetch user profile'), null);
    }
  }
));

// =====================
// Passport Twitch Strategy
// =====================
passport.use(new TwitchStrategy(
  {
    clientID: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_CLIENT_SECRET,
    callbackURL: TWITCH_CALLBACK_URL,
    scope: "user:read:email",
    passReqToCallback: true,
  },
  async function (req, accessToken, refreshToken, profile, done) {
    try {
      console.log('Twitch Profile:', profile);
      
      const emailTwitch = profile.email;
      if (!emailTwitch) {
        return done(new Error('No email provided by Twitch'), null);
      }

      // Store Twitch token
      await db.setTwitchTokenForUser(emailTwitch, accessToken);

      // Find or create user
      let user = await db.getUserByEmailTwitch(emailTwitch).catch(err => {
        console.log('Error finding Twitch user:', err);
        return null;
      });

      if (!user) {
        const username = profile.display_name || `twitch_${Date.now()}`;
        try {
          const newUserId = await db.createUser({
            Username: username,
            emailSpotify: '',
            emailTwitch: emailTwitch,
            emailGoogle: '',
            Position: '',
            Password: '',
            DateBorn: ''
          });
          user = await db.getUserById(newUserId);
        } catch (createError) {
          console.error('Error creating new user:', createError);
          return done(createError);
        }
      }

      return done(null, {
        id: user.id,
        Username: user.Username,
        emailSpotify: user.emailSpotify,
        emailTwitch: user.emailTwitch,
        emailGoogle: user.emailGoogle,
        isAdmin: user.isAdmin
      });
    } catch (err) {
      console.error('Twitch Auth Error:', err);
      return done(err);
    }
  }
));

// =====================
// Passport Google Strategy
// =====================
passport.use(new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    passReqToCallback: true,
  },
  async function (req, accessToken, refreshToken, profile, done) {
    console.log('Google Strategy Callback Invoked');
    console.log('Access Token:', accessToken);
    const emailGoogle = (profile.emails && profile.emails[0]) ? profile.emails[0].value : '';

    try {
      // Handle token database operations
      await db.setGoogleTokenForUser(emailGoogle, accessToken);

      // Check/Create user
      let user = await db.getUserByEmailGoogle(emailGoogle);
      if (!user) {
        const username = profile.displayName || `google_${Date.now()}`;
        const newUserId = await db.createUser({
          Username: username,
          emailSpotify: '',
          emailTwitch: '',
          emailGoogle,
          Position: '',
          Password: '',
          DateBorn: ''
        });
        user = await db.getUserById(newUserId);
      }

      return done(null, {
        id: user.id,
        Username: user.Username,
        emailSpotify: user.emailSpotify,
        emailTwitch: user.emailTwitch,
        emailGoogle: user.emailGoogle,
        isAdmin: user.isAdmin
      });
    } catch (err) {
      console.error('Error in Google Strategy:', err);
      return done(new Error('Failed to fetch user profile'), null);
    }
  }
));

// =====================
// Swagger Configuration
// =====================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - Username
 *         - Password
 *       properties:
 *         id:
 *           type: integer
 *         Username:
 *           type: string
 *         emailSpotify:
 *           type: string
 *         emailTwitch:
 *           type: string
 *         emailGoogle:
 *           type: string
 *         isAdmin:
 *           type: integer
 *         Position:
 *           type: string
 *         Password:
 *           type: string
 *         DateBorn:
 *           type: string
 *       example:
 *         id: 1
 *         Username: johndoe
 *         emailSpotify: johndoe@spotify.com
 *         emailTwitch: johndoe@twitch.tv
 *         emailGoogle: johndoe@google.com
 *         isAdmin: 0
 *         Position: Treviglio
 *         Password: password123
 *         DateBorn: 1990-01-01
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestione e autenticazione degli utenti
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Registrare un nuovo utente
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Utente aggiunto con successo
 *       400:
 *         description: Username e Password sono obbligatori
 *       409:
 *         description: Nome utente o Email Twitch o Email Google già in uso
 *       500:
 *         description: Errore del server
 */

// Create user
app.post('/users', async (req, res) => {
  const { Username, Email, emailSpotify, emailTwitch, emailGoogle, Position, Password, DateBorn } = req.body;

  if (!Username || !Password) {
    return res.status(400).json({ message: "Username e Password sono obbligatori." });
  }

  try {
    // Check if username already exists
    const existingUser = await db.getUserByUsername(Username);
    if (existingUser) {
      return res.status(409).json({ message: "Nome utente già in uso." });
    }

    // Check if email already exists
    if (Email) {
      const existingEmail = await db.getUserByEmail(Email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email già in uso." });
      }
    }

    const userId = await db.createUser({
      Username,
      Email,
      emailSpotify,
      emailTwitch,
      emailGoogle,
      Position,
      Password,
      DateBorn
    });

    res.json({ message: userId });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ message: "Errore del server durante la creazione dell'utente." });
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login dell'utente
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Username
 *               - Password
 *             properties:
 *               Username:
 *                 type: string
 *               Password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login riuscito
 *       400:
 *         description: Username e Password sono obbligatori
 *       401:
 *         description: Credenziali non valide
 *       500:
 *         description: Errore del server
 */

// Improve the /login endpoint to properly integrate with Passport
app.post('/login', async (req, res) => {
  const { Username, Password } = req.body;

  if (!Username || !Password) {
    return res.status(400).send({ message: 'Username e Password sono obbligatori.' });
  }

  try {
    const user = await db.getUserByUsername(Username);
    if (!user || user.Password !== Password) {
      return res.status(401).send({ message: 'Credenziali non valide' });
    }

    // Set session data
    req.session.authenticated = true;
    req.session.user = {
      id: user.id,
      isAdmin: user.isAdmin === 1
    };

    // Also log in with Passport for consistency with OAuth flows
    req.login({
      id: user.id,
      Username: user.Username,
      emailSpotify: user.emailSpotify,
      emailTwitch: user.emailTwitch,
      emailGoogle: user.emailGoogle,
      isAdmin: user.isAdmin
    }, (err) => {
      if (err) {
        console.error('Error in Passport login:', err);
      }
    });

    // Mark user online
    setUserOnline(user.id, true);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.Username,
        isAdmin: user.isAdmin === 1
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set JWT token in a cookie
    res.cookie('jwt_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure in production
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Send response with token (for client-side storage if needed)
    res.send({ 
      message: 'Login successful',
      token: token 
    });
  } catch (err) {
    console.error('Errore durante il login:', err.message);
    res.status(500).send({ message: 'Errore del server.' });
  }
});

/**
 * @swagger
 * /api/deezer/search:
 *   get:
 *     summary: Search for tracks on Deezer
 *     tags: [Deezer]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The search term for tracks
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: A list of tracks from Deezer
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Deezer track ID
 *                   name:
 *                     type: string
 *                     description: Track name
 *                   artist:
 *                     type: string
 *                     description: Artist name
 *                   albumName:
 *                     type: string
 *                     description: Album name
 *                   imageUrl:
 *                     type: string
 *                     description: URL to album cover art (medium size)
 *                   type:
 *                     type: string
 *                     description: Item type (e.g., 'track')
 *       400:
 *         description: Missing query parameter
 *       500:
 *         description: Error fetching data from Deezer or server error
 */
app.get('/api/deezer/search', async (req, res) => {
  const { query, limit = 10 } = req.query;

  if (!query) {
    return res.status(400).json({ message: 'Search query is required.' });
  }

  try {
    const response = await axios.get(`${DEEZER_API_BASE_URL}search/track`, {
      params: {
        q: query,
        limit: limit,
        order: 'RANKING', // You can also use 'TRACK_ASC', 'ARTIST_ASC', etc.
      },
    });

    if (response.data && response.data.data) {
      const tracks = response.data.data.map(track => ({
        id: track.id,
        name: track.title_short || track.title,
        artist: track.artist.name,
        albumName: track.album.title,
        imageUrl: track.album.cover_medium || track.album.cover_small || null, // Prefer medium, fallback to small
        type: 'track', // To identify the item type
      }));
      res.json(tracks);
    } else {
      // Deezer might return an empty data array or an error structure
      console.error('Deezer API response format unexpected or error:', response.data);
      res.status(500).json({ message: 'Error fetching data from music service or no results.' });
    }
  } catch (error) {
    console.error('Error calling Deezer API:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Server error while searching music.' });
  }
});

/**
 * @swagger
 * /admin/test:
 *   get:
 *     summary: Admin-only test endpoint
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test message
 *       401:
 *         description: Authentication token required
 *       403:
 *         description: Not authorized or invalid token
 */
app.get('/admin/test', (req, res, next) => {
  // JWT verification middleware - check header or cookie
  let token;
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies.jwt_token) {
    token = req.cookies.jwt_token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Admin privileges required' });
    }
    
    req.user = decoded;
    next();
  });
}, (req, res) => {
  res.json({ message: 'test' });
});

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout dell'utente
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Logout effettuato con successo
 *       500:
 *         description: Errore del server
 */

// Logout
app.post('/logout', (req, res) => {
  if (req.session.user && req.session.user.id) {
    setUserOnline(req.session.user.id, false);
  }

  // Clear the JWT token cookie
  res.clearCookie('jwt_token');

  req.session.destroy((err) => {
    if (err) {
      console.error('Errore durante la distruzione della sessione:', err.message);
      return res.status(500).send({ message: 'Errore durante il logout.' });
    }
    res.clearCookie('connect.sid');
    res.send({ message: 'Logout effettuato con successo' });
  });
});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Ottenere la lista degli utenti con filtri opzionali
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         description: Filtra per ID utente
 *       - in: query
 *         name: Position
 *         schema:
 *           type: string
 *         description: Filtra per posizione
 *       - in: query
 *         name: DateBorn
 *         schema:
 *           type: string
 *         description: Filtra per data di nascita
 *     responses:
 *       200:
 *         description: Lista degli utenti
 *         content: 
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Errore del server
 */

// Get users with filters - Updated to include ID filter
app.get('/users', async (req, res) => {
  const { id, Position, DateBorn } = req.query;

  try {
    if (id) {
      // If ID is provided, get specific user
      const user = await db.getUserById(id);
      if (user) {
        res.send([user]); // Return as array to maintain consistent response format
      } else {
        res.send([]); // User not found, return empty array
      }
    } else {
      // Otherwise get filtered list
      const usersList = await db.getUsers({ Position, DateBorn });
      res.send(usersList);
    }
  } catch (err) {
    console.error('Errore nel recupero utenti:', err.message);
    res.status(500).send({ message: 'Errore del server.' });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Aggiornare un utente per ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'ID dell'utente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Utente aggiornato con successo
 *       403:
 *         description: Forbidden: Non puoi aggiornare altri utenti
 *       404:
 *         description: Utente non trovato
 *       500:
 *         description: Errore del server
 */

// Update user
app.put('/users/:id', async (req, res) => {
  const { Username, emailSpotify, emailTwitch, emailGoogle, Position, Password, DateBorn } = req.body;
  const { id } = req.params;

  const isAdmin = req.headers['isadmin'] === 'true';
  const requesterId = req.headers['userid'];

  const userId = id.toString();
  const reqId = requesterId ? requesterId.toString() : null;

  if (!isAdmin && reqId !== userId) {
    return res.status(403).send({ message: 'Forbidden: Cannot update other users' });
  }

  try {
    let isAdminToSet = isAdmin ? 1 : 0;

    if (!isAdmin) {
      const existingUser = await db.getUserById(id);
      if (!existingUser) {
        return res.status(404).send({ message: 'User not found' });
      }
      isAdminToSet = existingUser.isAdmin;
    }

    const changes = await db.updateUser(id, {
      Username, emailSpotify, emailTwitch, emailGoogle, Position, Password, DateBorn, isAdmin: isAdminToSet
    });

    if (changes === 0) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.send({ message: `User updated with ID: ${id}` });
  } catch (err) {
    console.error('Errore nell\'aggiornamento:', err.message);
    res.status(500).send({ message: err.message });
  }
});

// Get specific user by ID
app.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await db.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove sensitive information
    delete user.Password;

    // Parse favorite_selections if it's a string
    if (user.favorite_selections && typeof user.favorite_selections === 'string') {
      try {
        user.favorite_selections = JSON.parse(user.favorite_selections);
      } catch (e) {
        console.error("Error parsing favorite_selections for user:", userId, e);
        user.favorite_selections = null; // Or handle error as appropriate
      }
    } else if (!user.favorite_selections) {
      user.favorite_selections = null; // Ensure it's explicitly null if not set
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /users/{id}/set-favorites:
 *   post:
 *     summary: Set user's favorite music selections
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               favorites:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of favorite selections (max 3)
 *             example:
 *               favorites: ["Rock", "Queen", "Jazz"]
 *     responses:
 *       200:
 *         description: Favorites updated successfully
 *       400:
 *         description: Invalid request (e.g., too many favorites)
 *       401:
 *         description: Unauthorized (user can only update their own favorites unless admin)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
app.post('/users/:id/set-favorites', async (req, res) => {
  const { id } = req.params;
  const { favorites } = req.body; // favorites will now be an array of Deezer track objects

  // Updated validation for objects
  if (!Array.isArray(favorites) || favorites.length > 3) {
    return res.status(400).json({ message: 'Favorites must be an array with a maximum of 3 items.' });
  }
  // Example validation if favorites are objects like { id, name, artist, imageUrl, type }
  if (favorites.some(fav => 
      typeof fav !== 'object' || 
      fav.id === undefined || // Deezer IDs are numbers
      typeof fav.name !== 'string' || fav.name.trim() === '' ||
      typeof fav.artist !== 'string' || fav.artist.trim() === '' ||
      typeof fav.type !== 'string' // e.g., 'track'
    )) {
    return res.status(400).json({ message: 'Each favorite must be a valid music item object with id, name, artist, and type.' });
  }

  // Authorization
  if (!req.session.user || req.session.user.id.toString() !== id /* && !req.session.user.isAdmin */) {
      if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized: No active session.' });
      }
      if (req.session.user.id.toString() !== id) { // Basic check, admin override can be added
           return res.status(401).json({ message: 'Unauthorized to set favorites for this user.' });
      }
  }

  try {
    const changes = await db.setUserFavoriteSelections(id, favorites); 
    if (changes === 0) {
      return res.status(404).json({ message: 'User not found or no changes made.' });
    }
    res.status(200).json({ message: 'Favorites updated successfully.' });
  } catch (err) {
    console.error('Error setting favorites:', err.message);
    res.status(500).json({ message: 'Server error while setting favorites.' });
  }
});

// Get user's favorite music with enhanced artist and genre information
app.get('/users/:id/favorites', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await db.getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Parse favorite_selections JSON string if it exists
    let parsedSelections;
    try {
      parsedSelections = user.favorite_selections ? JSON.parse(user.favorite_selections) : null;
    } catch (e) {
      console.error('Error parsing favorite_selections:', e);
      parsedSelections = null;
    }
    
    // Now use the parsed selections
    const favoriteTracks = Array.isArray(parsedSelections) ? parsedSelections : [];
    
    // Rest of your code remains the same
    const artistIds = new Set();
    const artistsMap = {};
    
    // First pass: collect unique artist IDs and create a mapping
    favoriteTracks.forEach(track => {
      if (track && track.artist) {
        // Some implementations might store artist ID directly
        const artistId = track.artistId || track.artist_id;
        if (artistId) {
          artistIds.add(artistId);
        }
      }
    });

    // Fetch detailed artist information
    const artists = [];
    
    // Only make API calls if we have artist IDs
    if (artistIds.size > 0) {
      // Fetch artist details from Deezer
      const artistPromises = Array.from(artistIds).map(async (artistId) => {
        try {
          const response = await axios.get(`${DEEZER_API_BASE_URL}artist/${artistId}`);
          if (response.data) {
            // Store artist in our map and add to array
            artistsMap[artistId] = response.data;
            return {
              id: response.data.id,
              name: response.data.name,
              picture: response.data.picture_medium || response.data.picture,
              tracklist: response.data.tracklist,
              type: 'artist'
            };
          }
        } catch (error) {
          console.error(`Error fetching artist ${artistId}:`, error.message);
          return null;
        }
      });
      
      // Wait for all artist API calls to complete
      const artistResults = await Promise.all(artistPromises);
      artists.push(...artistResults.filter(a => a !== null));
    }
    
    // Fetch genre information
    let genres = [];
    try {
      // Get list of genres from Deezer
      const genresResponse = await axios.get(`${DEEZER_API_BASE_URL}genre`);
      
      if (genresResponse.data && genresResponse.data.data) {
        // Transform genre data to match our format
        genres = genresResponse.data.data.map(genre => ({
          id: genre.id,
          name: genre.name,
          picture: genre.picture_medium || genre.picture,
          type: 'genre'
        }));
      }
    } catch (error) {
      console.error('Error fetching genres:', error.message);
      // If genres fetch fails, we'll return an empty array
    }

    console.log('Favorite tracks:', favoriteTracks);
    console.log('Artists:', artists);
    console.log('Genres:', genres);

    res.json({
      tracks: favoriteTracks,
      artists: artists,
      genres: genres.slice(0, 10) // Limit to top 10 genres to avoid overwhelming response
    });

  } catch (error) {
    console.error('Error fetching user favorites:', error);
    res.status(500).json({ message: 'Server error while fetching favorites.' });
  }
});

// Calculate music compatibility between users
app.get('/users/compatibility/:user1Id/:user2Id', async (req, res) => {
  try {
    // This would typically use an algorithm comparing user preferences
    // Mocking data for now
    res.json({
      score: Math.floor(Math.random() * 50) + 50, // Random score between 50-99
      commonArtists: ["The Weeknd", "Dua Lipa"],
      commonGenres: ["Pop", "R&B"]
    });
  } catch (error) {
    console.error('Error calculating compatibility:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Cancellare un utente per ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: L'ID dell'utente
 *     responses:
 *       200:
 *         description: Utente cancellato con successo
 *       403:
 *         description: Forbidden: Non puoi cancellare altri utenti
 *       404:
 *         description: Utente non trovato
 *       500:
 *         description: Errore del server
 */

// Delete user
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  const isAdmin = req.headers['isadmin'] === 'true';
  const requesterId = req.headers['userid'];

  const userId = id.toString();
  const reqId = requesterId ? requesterId.toString() : null;

  if (!isAdmin && reqId !== userId) {
    return res.status(403).send({ message: 'Forbidden: Cannot delete other users' });
  }

  try {
    const changes = await db.deleteUser(id);
    if (changes === 0) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.send({ message: `User deleted with ID: ${id}` });
  } catch (err) {
    console.error('Errore nella cancellazione:', err.message);
    res.status(500).send({ message: err.message });
  }
});

/**
 * @swagger
 * /auth/spotify:
 *   get:
 *     summary: Iniziare l'autenticazione con Spotify
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Reindirizzamento a Spotify per l'autenticazione
 */

/**
 * @swagger
 * /auth/spotify/callback:
 *   get:
 *     summary: Callback URL per Spotify dopo l'autenticazione
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Reindirizzamento al frontend dopo l'autenticazione
 */

/**
 * @swagger
 * /auth/twitch:
 *   get:
 *     summary: Iniziare l'autenticazione con Twitch
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Reindirizzamento a Twitch per l'autenticazione
 */

/**
 * @swagger
 * /auth/twitch/callback:
 *   get:
 *     summary: Callback URL per Twitch dopo l'autenticazione
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Reindirizzamento al frontend dopo l'autenticazione
 */

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Iniziare l'autenticazione con Google
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Reindirizzamento a Google per l'autenticazione
 */

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Callback URL per Google dopo l'autenticazione
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Reindirizzamento al frontend dopo l'autenticazione
 */

// Spotify Auth
app.get('/auth/spotify',
  (req, res, next) => {
    req.session.destroy((err) => {
      if (err) console.error('Error clearing session:', err);
      next();
    });
  },
  passport.authenticate('spotify', {
    scope: ['user-read-email', 'user-top-read', 'user-read-currently-playing'],
    showDialog: true
  })
);

app.get('/auth/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: '/' }),
  (req, res) => {
    req.session.authenticated = true;
    req.session.user = {
      id: req.user.id,
      isAdmin: req.user.isAdmin === 1
    };

    setUserOnline(req.user.id, true);

    res.redirect(FRONTEND_CALLBACK_URL || '/auth/callback');
  }
);

// Twitch Auth
app.get('/auth/twitch',
  (req, res, next) => {
    req.session.destroy((err) => {
      if (err) console.error('Error clearing session:', err);
      next();
    });
  },
  passport.authenticate('twitch') // Adjust scopes if necessary
);

app.get('/auth/twitch/callback',
  passport.authenticate('twitch', { failureRedirect: '/' }),
  (req, res) => {
    req.session.authenticated = true;
    req.session.user = {
      id: req.user.id,
      isAdmin: req.user.isAdmin === 1
    };

    setUserOnline(req.user.id, true);

    res.redirect(FRONTEND_CALLBACK_URL || '/auth/callback');
  }
);

// Google Auth
app.get('/auth/google',
  (req, res, next) => {
    req.session.destroy((err) => {
      if (err) console.error('Error clearing session:', err);
      next();
    });
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account' // Optional: Forces account selection
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    req.session.authenticated = true;
    req.session.user = {
      id: req.user.id,
      isAdmin: req.user.isAdmin === 1
    };

    setUserOnline(req.user.id, true);

    res.redirect(FRONTEND_CALLBACK_URL || '/auth/callback');
  }
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Ottenere informazioni sull'utente autenticato
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Informazioni sull'utente autenticato
 *       401:
 *         description: Non autenticato
 */

// Update the /auth/me endpoint to handle regular logins
app.get('/auth/me', async (req, res) => {
  // Check if authenticated via Passport (OAuth logins)
  if (req.isAuthenticated()) {
    return res.send({
      userId: req.user.id,
      isAdmin: req.user.isAdmin === 1,
      emailSpotify: req.user.emailSpotify || null,
      emailTwitch: req.user.emailTwitch || null,
      emailGoogle: req.user.emailGoogle || null
    });
  }
  
  // Check if authenticated via session (regular login)
  if (req.session && req.session.authenticated && req.session.user) {
    try {
      // Get full user details from database
      const user = await db.getUserById(req.session.user.id);
      if (user) {
        return res.send({
          userId: user.id,
          isAdmin: user.isAdmin === 1,
          emailSpotify: user.emailSpotify || null,
          emailTwitch: user.emailTwitch || null,
          emailGoogle: user.emailGoogle || null
        });
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  }
  
  // Not authenticated by either method
  return res.status(401).send({ message: 'Not authenticated' });
});

app.get('/login/spotify', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/auth/callback');
  }
  res.redirect('/auth/spotify');
});

app.get('/login/twitch', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/auth/callback');
  }
  res.redirect('/auth/twitch');
});

app.get('/login/google', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/auth/callback');
  }
  res.redirect('/auth/google');
});

/**
 * @swagger
 * /favorites:
 *   get:
 *     summary: Ottenere le tracce preferite dell'utente da Spotify
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Lista delle tracce preferite
 *       401:
 *         description: Non autenticato
 *       400:
 *         description: Access Token non disponibile
 *       500:
 *         description: Errore del server
 */

// Get User's Favorite Tracks from Spotify
app.get('/favorites', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send('Non autenticato');

  const emailSpotify = req.user.emailSpotify;
  try {
    const row = await db.getSpotifyTokenByEmail(emailSpotify);

    if (!row || !row.token) {
      return res.status(400).send('Access Token non disponibile');
    }

    const accessToken = row.token;
    let allTracks = [];
    let url = 'https://api.spotify.com/v1/me/top/tracks?limit=50';

    // Fetch all pages
    while (url) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        console.error('Spotify API Error:', response.statusText);
        return res.status(500).send('Errore nel recupero delle tracce da Spotify');
      }

      const data = await response.json();
      allTracks = [...allTracks, ...data.items];
      url = data.next; // Will be null when no more pages
    }

    console.log(`Total tracks fetched: ${allTracks.length}`);
    res.json(allTracks);

  } catch (error) {
    console.error('Errore:', error);
    res.status(500).send('Errore del server');
  }
});

/**
 * @swagger
 * /auth/check-session:
 *   get:
 *     summary: Controllare lo stato della sessione utente
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Stato della sessione
 *       500:
 *         description: Errore del server
 */

// Check Session Status
app.get('/auth/check-session', (req, res) => {
  res.json({
    authenticated: req.session.authenticated === true,
    user: req.session.user || null
  });
});

// Protect /users routes after authentication check
app.use('/users', (req, res, next) => {
  if (!req.session.authenticated) {
    return res.status(401).send({ message: 'Not authenticated' });
  }
  next();
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Home route
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Messaggio di benvenuto
 */

// Home Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Add this after your other auth routes
app.get('/auth/callback', (req, res) => {
  // Serve your authentication success page or redirect to the frontend app
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// =====================
// WebSocket Server Setup
// =====================
const server = http.createServer(app);
const wss = new Server({ server });

let usersStatus = {};

function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function broadcastUserStatuses() {
  const allStatuses = Object.keys(usersStatus).map(userId => ({
    userId,
    ...usersStatus[userId]
  }));
  broadcast({ type: 'status_update', data: allStatuses });
}

wss.on('connection', (ws) => {
  // Send current statuses to the newly connected client
  const allStatuses = Object.keys(usersStatus).map(userId => ({
    userId,
    ...usersStatus[userId]
  }));
  ws.send(JSON.stringify({ type: 'status_update', data: allStatuses }));
});

function setUserOnline(userId, isOnline = true) {
  if (!usersStatus[userId]) {
    usersStatus[userId] = {};
  }
  usersStatus[userId].online = isOnline;
  // No longer clearing the listening info on going offline.
  broadcastUserStatuses();
}

function setUserListening(userId, listeningInfo) {
  if (!usersStatus[userId]) {
    usersStatus[userId] = {};
  }
  // Even if the user is offline, we store their listening info.
  usersStatus[userId].listening = listeningInfo;
  broadcastUserStatuses();
}

async function updateListeningStatuses() {
  try {
    const spotifyTokens = await db.getAllSpotifyTokens();
    const googleTokens = await db.getAllGoogleTokens(); // Fetch Google tokens

    // Update Spotify Listening Status
    for (const row of spotifyTokens) {
      const emailSpotify = row.emailSpotify;
      const accessToken = row.token;

      const user = await db.getUserByEmailSpotify(emailSpotify);
      if (!user) continue;

      try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status === 200) {
          const data = await response.json();
          if (data && data.item) {
            const listeningInfo = {
              service: 'spotify',
              trackName: data.item.name,
              artists: data.item.artists.map(a => a.name).join(', '),
              album: data.item.album.name,
              trackUrl: data.item.external_urls.spotify
            };
            setUserListening(user.id, listeningInfo);
          } else {
            // Not currently playing anything
            if (usersStatus[user.id]) {
              usersStatus[user.id].listening = null;
            }
          }
        } else {
          // No access or not currently playing
          if (usersStatus[user.id]) {
            usersStatus[user.id].listening = null;
          }
        }
      } catch (error) {
        console.error('Error updating Spotify listening status for user', user.id, error);
      }
    }

    // Update Google Listening Status (Esempio: Ottieni informazioni dall'API di Google, se applicabile)
    // Nota: Google non ha un'API simile a Spotify per lo stato di riproduzione attuale.
    // Potresti implementare altre funzionalità relative a Google qui.

    broadcastUserStatuses();
  } catch (error) {
    console.error('Error updating listening statuses:', error);
  }
}

// Update listening status every 15 seconds
setInterval(updateListeningStatuses, 15 * 1000);

// =====================
// Start Server
// =====================
server.listen(port, () => {
  console.log(`Server in esecuzione su http://localhost:${port}`);
  console.log(`Swagger UI disponibile su http://localhost:${port}/api-docs`);
});
