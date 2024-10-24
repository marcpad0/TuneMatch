// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { spawn } = require('child_process'); 
const path = require('path');
const cors = require('cors'); 
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Connessione al database SQLite
let db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connesso al database.');
});

// Creazione della tabella utenti se non esiste
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Username TEXT UNIQUE,
    emailSpotify TEXT,
    isAdmin INTEGER,
    Position TEXT,
    Password TEXT,
    DateBorn TEXT
)`);

// Endpoint di registrazione utente
app.post('/users', (req, res) => {
    const { Username, emailSpotify, Position, Password, DateBorn } = req.body;

    if (!Username || !Password) {
        return res.status(400).send({ message: 'Username e Password sono obbligatori.' });
    }

    // Controlla se il nome utente esiste già
    db.get('SELECT * FROM users WHERE Username = ?', [Username], (err, row) => {
        if (err) {
            console.error('Errore nel controllo del nome utente:', err.message);
            return res.status(500).send({ message: 'Errore del server.' });
        }
        if (row) {
            // Nome utente già esistente
            return res.status(409).send({ message: 'Nome utente già in uso.' });
        } else {
            // Nome utente disponibile, procedi con l'inserimento
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

// Endpoint di login utente
app.post('/login', (req, res) => {
    const { Username, Password } = req.body;

    if (!Username || !Password) {
        return res.status(400).send({ message: 'Username e Password sono obbligatori.' });
    }

    console.log('Tentativo di login:', Username);

    db.get('SELECT * FROM users WHERE Username = ?', [Username], (err, user) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send({ message: err.message });
        }
        if (!user) {
            return res.status(401).send({ message: 'Credenziali non valide' });
        }

        // Comparazione password in chiaro
        if (user.Password !== Password) {
            return res.status(401).send({ message: 'Credenziali non valide' });
        }

        console.log('Login riuscito per utente:', user.Username);

        if (user.isAdmin) {
            db.all('SELECT * FROM users', [], (err, rows) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).send({ message: err.message });
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

// Endpoint per ottenere gli utenti (con filtri opzionali)
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
            console.error(err.message);
            return res.status(500).send({ message: err.message });
        }
        res.send(rows);
    });
});

// Endpoint per aggiornare un utente per ID
app.put('/users/:id', (req, res) => {
    const { Username, emailSpotify, Position, Password, DateBorn } = req.body;
    const { id } = req.params;

    const isAdmin = req.headers['isadmin'] === 'true';
    const requesterId = req.headers['userid'];

    console.log('Richiesta di aggiornamento utente:', { id, isAdmin, requesterId });

    const userId = id.toString();
    const reqId = requesterId.toString();

    console.log('Confronto IDs:', { reqId, userId });

    if (!isAdmin && reqId !== userId) {
        console.log('Accesso negato: Utente non amministratore che tenta di aggiornare un altro profilo.');
        return res.status(403).send({ message: 'Forbidden: Cannot update other users' });
    }

    let isAdminToSet = isAdmin ? 1 : 0;
    if (!isAdmin) {
        db.get('SELECT isAdmin FROM users WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Errore nel recupero di isAdmin:', err.message);
                return res.status(500).send({ message: err.message });
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

// Endpoint per cancellare un utente per ID
app.delete('/users/:id', (req, res) => {
    const { id } = req.params;

    // Recupera le intestazioni
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

// Chiudi la connessione al database su SIGINT
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connessione al database chiusa.');
        process.exit(0);
    });
});

// Avvia il progetto Vue
const startVueProject = () => {
    const vueProjectPath = path.join(__dirname, '../sites'); // Adjust the path as needed
    const vueProcess = spawn('npm', ['run', 'serve'], {
        cwd: vueProjectPath,
        stdio: 'inherit', 
        shell: true 
    });

    vueProcess.on('error', (err) => {
        console.error('Failed to start Vue process:', err);
    });

    vueProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Vue process exited with code ${code}`);
        } else {
            console.log('Vue process exited successfully.');
        }
    });
};

// Avvia il server
app.listen(port, () => {
    console.log(`Server in esecuzione su http://localhost:${port}`);
    startVueProject()
});
