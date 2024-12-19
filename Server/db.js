// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize main database
const db = new sqlite3.Database(path.resolve(__dirname, './database.db'), (err) => {
  if (err) {
    console.error('Errore nella connessione al database principale:', err.message);
    process.exit(1);
  }
  console.log('Connesso al database SQLite principale.');
});

// Initialize token database
const dbtoken = new sqlite3.Database(path.resolve(__dirname, './datatoken.db'), (err) => {
  if (err) {
    console.error('Errore nella connessione al database token:', err.message);
    process.exit(1);
  }
  console.log('Connesso al database SQLite per i token.');
});

// Create tables if they don't exist
db.serialize(() => {
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
});

dbtoken.serialize(() => {
  dbtoken.run(`
    CREATE TABLE IF NOT EXISTS token (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emailSpotify TEXT NOT NULL,
      token TEXT NOT NULL
    )
  `);
});

// Database Operation Functions
const dbOperations = {
  // User Operations
  getUserByUsername: (Username) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE Username = ?', [Username], (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });
  },

  createUser: ({ Username, emailSpotify = '', Position = '', Password, DateBorn = '' }) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (Username, emailSpotify, isAdmin, Position, Password, DateBorn) VALUES (?, ?, ?, ?, ?, ?)',
        [Username, emailSpotify, 0, Position, Password, DateBorn],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  },

  updateUser: (id, { Username, emailSpotify = '', Position = '', Password, DateBorn = '', isAdmin }) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET Username = ?, emailSpotify = ?, Position = ?, Password = ?, DateBorn = ?, isAdmin = ? WHERE id = ?',
        [Username, emailSpotify, Position, Password, DateBorn, isAdmin, id],
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

  // Token Operations
  setTokenForUser: (emailSpotify, accessToken) => {
    return new Promise((resolve, reject) => {
      dbtoken.serialize(() => {
        dbtoken.run('DELETE FROM token WHERE emailSpotify = ?', [emailSpotify], (delErr) => {
          if (delErr) return reject(delErr);
          dbtoken.run('INSERT INTO token (emailSpotify, token) VALUES (?, ?)', [emailSpotify, accessToken], function (err) {
            if (err) return reject(err);
            resolve(this.lastID);
          });
        });
      });
    });
  },

  getTokenByEmail: (emailSpotify) => {
    return new Promise((resolve, reject) => {
      dbtoken.get('SELECT * FROM token WHERE emailSpotify = ?', [emailSpotify], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  getAllTokens: () => {
    return new Promise((resolve, reject) => {
      dbtoken.all('SELECT * FROM token', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Gracefully close databases on shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Errore nella chiusura del database principale:', err.message);
    } else {
      console.log('Connessione al database principale chiusa.');
    }
    dbtoken.close((err) => {
      if (err) {
        console.error('Errore nella chiusura del database token:', err.message);
      } else {
        console.log('Connessione al database token chiusa.');
      }
      process.exit(0);
    });
  });
});

module.exports = dbOperations;
