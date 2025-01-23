// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Inizializza il database principale
const db = new sqlite3.Database(path.resolve(__dirname, './database.db'), (err) => {
  if (err) {
    console.error('Errore nella connessione al database principale:', err.message);
    process.exit(1);
  }
  console.log('Connesso al database SQLite principale.');
});

// Inizializza il database dei token Spotify
const dbtokenspotify = new sqlite3.Database(path.resolve(__dirname, './datatokenspotify.db'), (err) => {
  if (err) {
    console.error('Errore nella connessione al database token Spotify:', err.message);
    process.exit(1);
  }
  console.log('Connesso al database SQLite per i token Spotify.');
});

// Inizializza il database dei token Twitch
const dbtokenTwitch = new sqlite3.Database(path.resolve(__dirname, './datatokenTwitch.db'), (err) => { // Cambiato in datatokenTwitch.db
  if (err) {
    console.error('Errore nella connessione al database token Twitch:', err.message);
    process.exit(1);
  }
  console.log('Connesso al database SQLite per i token Twitch.');
});

// Inizializza il database dei token Google
const dbtokenGoogle = new sqlite3.Database(path.resolve(__dirname, './datatokenGoogle.db'), (err) => { // Nuovo database per Google
  if (err) {
    console.error('Errore nella connessione al database token Google:', err.message);
    process.exit(1);
  }
  console.log('Connesso al database SQLite per i token Google.');
});


db.serialize(() => {
  // Create users table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      Username TEXT UNIQUE,
      emailSpotify TEXT,
      emailTwitch TEXT, 
      emailGoogle TEXT,
      isAdmin INTEGER DEFAULT 0,
      Position TEXT,
      Password TEXT,
      DateBorn TEXT
    )
  `);
});

// Crea la tabella per i token Spotify
dbtokenspotify.serialize(() => {
  dbtokenspotify.run(`
    CREATE TABLE IF NOT EXISTS spotify_token (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emailSpotify TEXT NOT NULL,
      token TEXT NOT NULL
    )
  `);
});

// Crea la tabella per i token Twitch
dbtokenTwitch.serialize(() => { // Tabella separata per i token Twitch
  dbtokenTwitch.run(`
    CREATE TABLE IF NOT EXISTS Twitch_token (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emailTwitch TEXT NOT NULL,
      token TEXT NOT NULL
    )
  `);
});

// Crea la tabella per i token Google
dbtokenGoogle.serialize(() => { // Tabella separata per i token Google
  dbtokenGoogle.run(`
    CREATE TABLE IF NOT EXISTS Google_token (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emailGoogle TEXT NOT NULL,
      token TEXT NOT NULL
    )
  `);
});

// Funzioni di operazione del database
const dbOperations = {
  // Operazioni sugli utenti
  getUserByUsername: (Username) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE Username = ?', [Username], (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });
  },

  createUser: ({ Username, emailSpotify = '', emailTwitch = '', emailGoogle = '', Position = '', Password, DateBorn = '' }) => { // Aggiunto emailGoogle
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (Username, emailSpotify, emailTwitch, emailGoogle, isAdmin, Position, Password, DateBorn) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [Username, emailSpotify, emailTwitch, emailGoogle, 0, Position, Password, DateBorn],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  },

  updateUser: (id, { Username, emailSpotify = '', emailTwitch = '', emailGoogle = '', Position = '', Password, DateBorn = '', isAdmin }) => { // Aggiunto emailGoogle
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET Username = ?, emailSpotify = ?, emailTwitch = ?, emailGoogle = ?, Position = ?, Password = ?, DateBorn = ?, isAdmin = ? WHERE id = ?',
        [Username, emailSpotify, emailTwitch, emailGoogle, Position, Password, DateBorn, isAdmin, id],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });
  },

  deleteUser: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });
  },

  getUsers: ({ Position, DateBorn }) => {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM users';
      const conditions = [];
      const params = [];

      if (Position) {
        conditions.push('Position LIKE ?');
        params.push(`%${Position}%`);
      }

      if (DateBorn) {
        conditions.push('DateBorn = ?');
        params.push(DateBorn);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  getUserById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });
  },

  getUserByEmailSpotify: (emailSpotify) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE emailSpotify = ?', [emailSpotify], (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });
  },
  
  getUserByEmailTwitch: (emailTwitch) => { // Metodo aggiunto per ottenere l'utente tramite email Twitch
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE emailTwitch = ?', [emailTwitch], (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });
  },

  getUserByEmailGoogle: (emailGoogle) => { // Metodo aggiunto per ottenere l'utente tramite email Google
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE emailGoogle = ?', [emailGoogle], (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });
  },

  // Operazioni sui token Spotify
  setSpotifyTokenForUser: (emailSpotify, accessToken) => {
    return new Promise((resolve, reject) => {
      dbtokenspotify.serialize(() => {
        dbtokenspotify.run('DELETE FROM spotify_token WHERE emailSpotify = ?', [emailSpotify], (delErr) => {
          if (delErr) return reject(delErr);
          dbtokenspotify.run('INSERT INTO spotify_token (emailSpotify, token) VALUES (?, ?)', [emailSpotify, accessToken], function (err) {
            if (err) return reject(err);
            resolve(this.lastID);
          });
        });
      });
    });
  },

  getSpotifyTokenByEmail: (emailSpotify) => {
    return new Promise((resolve, reject) => {
      dbtokenspotify.get('SELECT * FROM spotify_token WHERE emailSpotify = ?', [emailSpotify], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAllSpotifyTokens: () => {
    return new Promise((resolve, reject) => {
      dbtokenspotify.all('SELECT * FROM spotify_token', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Operazioni sui token Twitch
  setTwitchTokenForUser: (emailTwitch, accessToken) => { // Nuovo metodo per Twitch
    return new Promise((resolve, reject) => {
      dbtokenTwitch.serialize(() => {
        dbtokenTwitch.run('DELETE FROM Twitch_token WHERE emailTwitch = ?', [emailTwitch], (delErr) => {
          if (delErr) return reject(delErr);
          dbtokenTwitch.run('INSERT INTO Twitch_token (emailTwitch, token) VALUES (?, ?)', [emailTwitch, accessToken], function (err) {
            if (err) return reject(err);
            resolve(this.lastID);
          });
        });
      });
    });
  },

  getTwitchTokenByEmail: (emailTwitch) => { // Nuovo metodo per Twitch
    return new Promise((resolve, reject) => {
      dbtokenTwitch.get('SELECT * FROM Twitch_token WHERE emailTwitch = ?', [emailTwitch], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAllTwitchTokens: () => { // Nuovo metodo per Twitch
    return new Promise((resolve, reject) => {
      dbtokenTwitch.all('SELECT * FROM Twitch_token', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Operazioni sui token Google
  setGoogleTokenForUser: (emailGoogle, accessToken) => { // Nuovo metodo per Google
    return new Promise((resolve, reject) => {
      dbtokenGoogle.serialize(() => {
        dbtokenGoogle.run('DELETE FROM Google_token WHERE emailGoogle = ?', [emailGoogle], (delErr) => {
          if (delErr) return reject(delErr);
          dbtokenGoogle.run('INSERT INTO Google_token (emailGoogle, token) VALUES (?, ?)', [emailGoogle, accessToken], function (err) {
            if (err) return reject(err);
            resolve(this.lastID);
          });
        });
      });
    });
  },

  getGoogleTokenByEmail: (emailGoogle) => { // Nuovo metodo per Google
    return new Promise((resolve, reject) => {
      dbtokenGoogle.get('SELECT * FROM Google_token WHERE emailGoogle = ?', [emailGoogle], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAllGoogleTokens: () => { // Nuovo metodo per Google
    return new Promise((resolve, reject) => {
      dbtokenGoogle.all('SELECT * FROM Google_token', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Chiudi i database in modo corretto durante lo shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Errore nella chiusura del database principale:', err.message);
    } else {
      console.log('Connessione al database principale chiusa.');
    }
    dbtokenspotify.close((err) => {
      if (err) {
        console.error('Errore nella chiusura del database token Spotify:', err.message);
      } else {
        console.log('Connessione al database token Spotify chiusa.');
      }
      dbtokenTwitch.close((err) => { // Assicurati che il DB Twitch sia chiuso
        if (err) {
          console.error('Errore nella chiusura del database token Twitch:', err.message);
        } else {
          console.log('Connessione al database token Twitch chiusa.');
        }
        dbtokenGoogle.close((err) => { // Chiudi anche il DB Google
          if (err) {
            console.error('Errore nella chiusura del database token Google:', err.message);
          } else {
            console.log('Connessione al database token Google chiusa.');
          }
          process.exit(0);
        });
      });
    });
  });
});

module.exports = dbOperations;
