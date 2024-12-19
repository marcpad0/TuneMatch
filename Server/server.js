// =====================
// Imports & Initial Setup
// =====================
const express = require('express');
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
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
const db = USE_MOCK_DB ? require('./dbmock') : require('./db');

const app = express();
const port = process.env.PORT || 3000;

// =====================
// Spotify Configuration
// =====================
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const CALLBACK_URL = process.env.SPOTIFY_CALLBACK_URL;

if (!CLIENT_ID || !CLIENT_SECRET || !CALLBACK_URL) {
  console.error('Spotify credentials not set in .env file!');
  process.exit(1);
}

// =====================
// Middleware Configuration
// =====================
app.use(express.json());

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://37.27.206.153:8080', // Frontend origin
  credentials: true,
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // Use strong secret in production
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
// Passport Spotify Strategy
// =====================
passport.use(new SpotifyStrategy(
  {
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    passReqToCallback: true,
  },
  async function (req, accessToken, refreshToken, expires_in, profile, done) {
    console.log('Spotify Strategy Callback Invoked');
    console.log('Access Token:', accessToken);
    const emailSpotify = (profile.emails && profile.emails[0]) ? profile.emails[0].value : '';

    try {
      // Handle token database operations
      await db.setTokenForUser(emailSpotify, accessToken);

      // Check/Create user
      let user = await db.getUserByEmailSpotify(emailSpotify);
      if (!user) {
        const username = profile.username || profile.displayName || `spotify_${Date.now()}`;
        const newUserId = await db.createUser({
          Username: username,
          emailSpotify,
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
        isAdmin: user.isAdmin
      });
    } catch (err) {
      console.error('Error in Spotify Strategy:', err);
      return done(new InternalOAuthError('failed to fetch user profile', err), null);
    }
  }
));

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
 *         description: Nome utente già in uso
 *       500:
 *         description: Errore del server
 */
// Create user
app.post('/users', async (req, res) => {
  const { Username, emailSpotify, Position, Password, DateBorn } = req.body;

  if (!Username || !Password) {
    return res.status(400).send({ message: 'Username e Password sono obbligatori.' });
  }

  try {
    const existingUser = await db.getUserByUsername(Username);
    if (existingUser) {
      return res.status(409).send({ message: 'Nome utente già in uso.' });
    }

    const newUserId = await db.createUser({ 
      Username, emailSpotify, Position, Password, DateBorn 
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
  const { Username, emailSpotify, Position, Password, DateBorn } = req.body;
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
      Username, emailSpotify, Position, Password, DateBorn, isAdmin: isAdminToSet 
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

    res.redirect('http://37.27.206.153:8080/auth/callback');
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
    emailSpotify: req.user.emailSpotify
  });
});

app.get('/login/spotify', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect(process.env.FRONTEND_CALLBACK_URL || 'http://37.27.206.153:8080/auth/callback');
  }
  res.redirect('/auth/spotify');
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
    const row = await db.getTokenByEmail(emailSpotify);

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
    const rows = USE_MOCK_DB ? await db.getAllTokens() : await db.getAllTokens(); // Adjust if needed

    for (const row of rows) {
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
        console.error('Error updating listening status for user', user.id, error);
      }
    }

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
