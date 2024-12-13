// server.js

// =====================
// Imports & Initial Setup
// =====================
const express = require('express');
const passport = require('passport');
const SpotifyStrategy = require('passport-spotify').Strategy;
const session = require('express-session');
const fetch = require('node-fetch'); // Make sure you've run: npm install node-fetch
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { swaggerUi, swaggerDocs } = require('./swagger'); // Ensure Swagger is configured properly
const dotenv = require('dotenv'); // For environment variables
const path = require('path');

const app = express();
const port = 3000;

dotenv.config();

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

// CORS setup for credentials
app.use(cors({
  origin: 'http://37.27.206.153:8080', // Frontend origin
  credentials: true,
}));

app.use(session({
  secret: 'tuo_segreto', // Replace with a secure secret
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// =====================
// Databases Initialization
// =====================
let dbtoken = new sqlite3.Database('./datatoken.db', (err) => {
  if (err) {
    console.error('Errore nella connessione al database token:', err.message);
  } else {
    console.log('Connesso al database SQLite per i token.');
  }
});

dbtoken.run(`
  CREATE TABLE IF NOT EXISTS token (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    emailSpotify TEXT,
    token TEXT
  )
`);

let db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Errore nella connessione al database:', err.message);
  } else {
    console.log('Connesso al database SQLite principale.');
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Username TEXT UNIQUE,
    emailSpotify TEXT,
    isAdmin INTEGER DEFAULT 0,
    Position TEXT,
    Password TEXT,
    DateBorn TEXT
  )
`);

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
  function (req, accessToken, refreshToken, expires_in, profile, done) {
    const emailSpotify = (profile.emails && profile.emails[0]) ? profile.emails[0].value : '';

    //delete token from database
    dbtoken.run(
      'DELETE FROM token WHERE emailSpotify = ?',
      [emailSpotify],
      (err) => {
        if (err) {
          console.error('Errore durante la cancellazione del token:', err.message);
          return done(err);
        }
        console.log('Token cancellato dal database');
      }
    );

    // Save token to database
    dbtoken.run(
      'INSERT INTO token (emailSpotify, token) VALUES (?, ?)',
      [emailSpotify, accessToken],
      (err) => {
        if (err) {
          console.error('Errore durante il salvataggio del token:', err.message);
          return done(err);
        }
        console.log('Token salvato nel database');
      }
    );

    // Check if user exists in the database
    db.get('SELECT * FROM users WHERE emailSpotify = ?', [emailSpotify], (err, user) => {
      if (err) return done(err);

      if (!user) {
        // Create a new user if not found
        const username = profile.username || profile.displayName || 'spotifyuser';
        db.run(
          'INSERT INTO users (Username, emailSpotify, isAdmin, Position, Password, DateBorn) VALUES (?, ?, ?, ?, ?, ?)',
          [username, emailSpotify, 0, '', '', ''],
          function (err) {
            if (err) return done(err);
            const newUser = {
              id: this.lastID,
              Username: username,
              emailSpotify: emailSpotify,
              isAdmin: 0,
              Position: '',
              Password: '',
              DateBorn: '',
            };
            console.log('Added new User');
            return done(null, newUser);
          }
        );
      } else {
        // User exists
        console.log('User exists');
        return done(null, user);
      }
    });
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return done(err);
    done(null, user);
  });
});

// =====================
// Swagger Configuration
// =====================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// =====================
// Authentication Routes
// =====================

// Initiate Spotify authentication
app.get('/auth/spotify', passport.authenticate('spotify', {
  scope: ['user-read-email', 'user-top-read'],
  showDialog: true
}));

// Spotify callback
app.get('/auth/spotify/callback',
  passport.authenticate('spotify', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('http://37.27.206.153:8080/auth/callback'); // Frontend route
  }
);

// Get current user info
app.get('/auth/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send({ message: 'Not authenticated' });
  }
  res.send({
    userId: req.user.id,
    isAdmin: req.user.isAdmin === 1,
  });
});

// Login with Spotifysss
app.get('/login/spotify', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('http://37.27.206.153:8080/auth/callback'); // Frontend route
  }
  res.redirect('/auth/spotify');
});

// Get user's favorite (top) tracks from Spotify
app.get('/favorites', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).send('Non autenticato');

  const emailSpotify = req.user.emailSpotify;
  console.log('Email Spotify:', emailSpotify);

  try {
    const row = await new Promise((resolve, reject) => {
      dbtoken.get('SELECT * FROM token WHERE emailSpotify = ?', [emailSpotify], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!row || !row.token) {
      return res.status(400).send('Access Token non disponibile');
    }

    const accessToken = row.token;
    console.log('Access Token:', accessToken);

    const response = await fetch('https://api.spotify.com/v1/me/top/tracks', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    console.log('Dati:', data);

    const tracks = data.items || [];
    res.json(tracks);

  } catch (error) {
    console.error('Errore:', error);
    res.status(500).send('Errore del server');
  }
});

// =====================
// User Management Routes
// =====================

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
 *           description: L'ID auto-generato dell'utente
 *         Username:
 *           type: string
 *           description: Il nome utente
 *         emailSpotify:
 *           type: string
 *           description: L'email Spotify dell'utente
 *         isAdmin:
 *           type: integer
 *           description: Flag di amministratore (0 o 1)
 *         Position:
 *           type: string
 *           description: La posizione dell'utente
 *         Password:
 *           type: string
 *           description: La password dell'utente
 *         DateBorn:
 *           type: string
 *           description: La data di nascita dell'utente
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
 *           example:
 *             Username: johndoe
 *             emailSpotify: johndoe@spotify.com
 *             Position: Treviglio
 *             Password: password123
 *             DateBorn: 1990-01-01
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
app.post('/users', (req, res) => {
  const { Username, emailSpotify, Position, Password, DateBorn } = req.body;

  if (!Username || !Password) {
    return res.status(400).send({ message: 'Username e Password sono obbligatori.' });
  }

  db.get('SELECT * FROM users WHERE Username = ?', [Username], (err, row) => {
    if (err) {
      console.error('Errore nel controllo del nome utente:', err.message);
      return res.status(500).send({ message: 'Errore del server.' });
    }

    if (row) {
      return res.status(409).send({ message: 'Nome utente già in uso.' });
    } else {
      db.run(
        'INSERT INTO users (Username, emailSpotify, isAdmin, Position, Password, DateBorn) VALUES (?, ?, ?, ?, ?, ?)',
        [Username, emailSpotify || '', 0, Position || '', Password, DateBorn || ''],
        function (err) {
          if (err) {
            console.error('Errore durante la registrazione:', err.message);
            return res.status(500).send({ message: err.message });
          }
          res.send({ message: `Utente aggiunto con ID: ${this.lastID}` });
        }
      );
    }
  });
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
 *             example:
 *               Username: johndoe
 *               Password: password123
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
app.post('/login', (req, res) => {
  const { Username, Password } = req.body;

  if (!Username || !Password) {
    return res.status(400).send({ message: 'Username e Password sono obbligatori.' });
  }

  console.log('Tentativo di login:', Username);

  db.get('SELECT * FROM users WHERE Username = ?', [Username], (err, user) => {
    if (err) {
      console.error('Errore nel recupero utente:', err.message);
      return res.status(500).send({ message: 'Errore del server.' });
    }
    if (!user || user.Password !== Password) {
      return res.status(401).send({ message: 'Credenziali non valide' });
    }

    console.log('Login riuscito per utente:', user.Username);

    if (user.isAdmin) {
      db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) {
          console.error('Errore nel recupero utenti:', err.message);
          return res.status(500).send({ message: 'Errore del server.' });
        }
        res.send({ 
          isAdmin: true, 
          users: rows,
          userId: user.id
        });
      });
    } else {
      res.send({ 
        isAdmin: false, 
        user: user,
        userId: user.id
      });
    }
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
app.get('/users', (req, res) => {
  const { Position, DateBorn } = req.query;

  let query = 'SELECT * FROM users';
  const conditions = [];
  const params = [];

  if (Position) {
    conditions.push('Position = ?');
    params.push(Position);
  }

  if (DateBorn) {
    conditions.push('DateBorn = ?');
    params.push(DateBorn);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Errore nel recupero utenti:', err.message);
      return res.status(500).send({ message: 'Errore del server.' });
    }
    res.send(rows);
  });
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
 *           example:
 *             Username: johndoe
 *             emailSpotify: johndoe@spotify.com
 *             Position: Treviglio
 *             Password: newpassword123
 *             DateBorn: 1990-01-01
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
app.put('/users/:id', (req, res) => {
  const { Username, emailSpotify, Position, Password, DateBorn } = req.body;
  const { id } = req.params;

  const isAdmin = req.headers['isadmin'] === 'true';
  const requesterId = req.headers['userid'];

  console.log('Richiesta di aggiornamento utente:', { id, isAdmin, requesterId });

  const userId = id.toString();
  const reqId = requesterId.toString();

  if (!isAdmin && reqId !== userId) {
    console.log('Accesso negato: Utente non amministratore che tenta di aggiornare un altro profilo.');
    return res.status(403).send({ message: 'Forbidden: Cannot update other users' });
  }

  let isAdminToSet = isAdmin ? 1 : 0;

  if (!isAdmin) {
    db.get('SELECT isAdmin FROM users WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Errore nel recupero di isAdmin:', err.message);
        return res.status(500).send({ message: 'Errore del server.' });
      }
      if (!row) {
        return res.status(404).send({ message: 'User not found' });
      }

      isAdminToSet = row.isAdmin;

      db.run(
        'UPDATE users SET Username = ?, emailSpotify = ?, Position = ?, Password = ?, DateBorn = ?, isAdmin = ? WHERE id = ?',
        [Username, emailSpotify || '', Position || '', Password, DateBorn || '', isAdminToSet, id],
        function (err) {
          if (err) {
            console.error('Errore nell\'aggiornamento:', err.message);
            return res.status(500).send({ message: err.message });
          }
          if (this.changes === 0) {
            return res.status(404).send({ message: 'User not found' });
          }
          console.log(`Utente aggiornato con ID: ${id}`);
          res.send({ message: `User updated with ID: ${id}` });
        }
      );
    });
  } else {
    db.run(
      'UPDATE users SET Username = ?, emailSpotify = ?, Position = ?, Password = ?, DateBorn = ?, isAdmin = ? WHERE id = ?',
      [Username, emailSpotify || '', Position || '', Password, DateBorn || '', isAdminToSet, id],
      function (err) {
        if (err) {
          console.error('Errore nell\'aggiornamento:', err.message);
          return res.status(500).send({ message: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).send({ message: 'User not found' });
        }
        console.log(`Utente aggiornato con ID: ${id}`);
        res.send({ message: `User updated with ID: ${id}` });
      }
    );
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
app.delete('/users/:id', (req, res) => {
  const { id } = req.params;

  const isAdmin = req.headers['isadmin'] === 'true';
  const requesterId = req.headers['userid'];

  console.log('Richiesta di cancellazione utente:', { id, isAdmin, requesterId });

  const userId = id.toString();
  const reqId = requesterId.toString();

  if (!isAdmin && reqId !== userId) {
    console.log('Accesso negato: Utente non amministratore che tenta di cancellare un altro profilo.');
    return res.status(403).send({ message: 'Forbidden: Cannot delete other users' });
  }

  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Errore nella cancellazione:', err.message);
      return res.status(500).send({ message: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).send({ message: 'User not found' });
    }
    console.log(`Utente cancellato con ID: ${id}`);
    res.send({ message: `User deleted with ID: ${id}` });
  });
});

// =====================
// Home Route
// =====================
app.get('/', (req, res) => {
  res.send('Benvenuto al server Express!');
});

// =====================
// Shutdown Handling
// =====================
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Errore nella chiusura del database:', err.message);
    }
    console.log('Connessione al database chiusa.');
    process.exit(0);
  });
});

// =====================
// Start Server
// =====================
app.listen(port, () => {
  console.log(`Server in esecuzione su http://localhost:${port}`);
  console.log(`Swagger UI disponibile su http://localhost:${port}/api-docs`);
});
