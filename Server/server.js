// =====================
// Imports & Initial Setup
// =====================
const express = require('express');
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const TwitchStrategy = require('passport-twitch-new').Strategy; // Updated to Twitch
const GoogleStrategy = require('passport-google-oauth20').Strategy; // Import Google Strategy
const session = require('express-session');
const fetch = require('node-fetch');
const cors = require('cors');
const { swaggerUi, swaggerDocs } = require('./swagger');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('ws'); // WebSocket server
const path = require('path');

// Load environment variables
dotenv.config();

// Select Database Implementation
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';
const db = USE_MOCK_DB ? require('./dbMock') : require('./db');

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
  GOOGLE_CLIENT_ID,          // Added Google Client ID
  GOOGLE_CLIENT_SECRET,      // Added Google Client Secret
  GOOGLE_CALLBACK_URL,       // Added Google Callback URL
  SESSION_SECRET,
  FRONTEND_CALLBACK_URL
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

// =====================
// Middleware Configuration
// =====================
app.use(express.json());

app.use(cors({
  origin: ['http://37.27.206.153:8080', 'https://marcpado.it'],
  credentials: true,
}));

app.use(session({
  secret: SESSION_SECRET || 'your-secret-key', // Use strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

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
  const { Username, emailSpotify, emailTwitch, emailGoogle, Position, Password, DateBorn } = req.body;

  if (!Username || !Password) {
    return res.status(400).send({ message: 'Username e Password sono obbligatori.' });
  }

  try {
    const existingUser = await db.getUserByUsername(Username);
    if (existingUser) {
      return res.status(409).send({ message: 'Nome utente già in uso.' });
    }

    // Optionally check for emailTwitch uniqueness
    if (emailTwitch) {
      const existingTwitchUser = await db.getUserByEmailTwitch(emailTwitch);
      if (existingTwitchUser) {
        return res.status(409).send({ message: 'Email Twitch già in uso.' });
      }
    }

    // Optionally check for emailGoogle uniqueness
    if (emailGoogle) {
      const existingGoogleUser = await db.getUserByEmailGoogle(emailGoogle);
      if (existingGoogleUser) {
        return res.status(409).send({ message: 'Email Google già in uso.' });
      }
    }

    const newUserId = await db.createUser({
      Username, emailSpotify, emailTwitch, emailGoogle, Position, Password, DateBorn
    });
    res.send({ message: `Utente aggiunto con ID: ${newUserId}` });
  } catch (err) {
    console.error('Errore durante la registrazione:', err.message);
    res.status(500).send({ message: err.message });
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

// Login
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

    req.session.authenticated = true;
    req.session.user = {
      id: user.id,
      isAdmin: user.isAdmin === 1
    };

    // Mark user online
    setUserOnline(user.id, true);

    res.send({ message: 'Login successful' });
  } catch (err) {
    console.error('Errore durante il login:', err.message);
    res.status(500).send({ message: 'Errore del server.' });
  }
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

// Get users with filters
app.get('/users', async (req, res) => {
  const { Position, DateBorn } = req.query;

  try {
    const usersList = await db.getUsers({ Position, DateBorn });
    res.send(usersList);
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

    res.redirect(FRONTEND_CALLBACK_URL || 'http://37.27.206.153:8080/auth/callback');
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

    res.redirect(FRONTEND_CALLBACK_URL || 'http://37.27.206.153:8080/auth/callback');
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

    res.redirect(FRONTEND_CALLBACK_URL || 'http://37.27.206.153:8080/auth/callback');
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

// Get Authenticated User Info
app.get('/auth/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send({ message: 'Not authenticated' });
  }
  res.send({
    userId: req.user.id,
    isAdmin: req.user.isAdmin === 1,
    emailSpotify: req.user.emailSpotify || null,
    emailTwitch: req.user.emailTwitch || null,
    emailGoogle: req.user.emailGoogle || null // Added emailGoogle
  });
});

app.get('/login/spotify', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('http://37.27.206.153:8080/auth/callback');
  }
  res.redirect('/auth/spotify');
});

app.get('/login/twitch', (req, res) => { // Updated to Twitch
  if (req.isAuthenticated()) {
    return res.redirect('http://37.27.206.153:8080/auth/callback');
  }
  res.redirect('/auth/twitch');
});

app.get('/login/google', (req, res) => { // New route for Google login
  if (req.isAuthenticated()) {
    return res.redirect('http://37.27.206.153:8080/auth/callback');
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
  res.send('Benvenuto al server Express!');
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
