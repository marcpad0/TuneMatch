// dbMock.js
let users = [
  {
    id: 1,
    Username: 'johndoe',
    emailSpotify: 'johndoe@spotify.com',
    emailTwitch: 'johndoe@Twitch.com', // Aggiunto per Twitch
    emailGoogle: 'johndoe@google.com', // Aggiunto per Google
    isAdmin: 1,
    Position: 'Treviglio',
    Password: 'adminpassword', // In uno scenario reale, le password dovrebbero essere hashate
    DateBorn: '1990-01-01'
  },
  {
    id: 2,
    Username: 'janedoe',
    emailSpotify: 'janedoe@spotify.com',
    emailTwitch: 'janedoe@Twitch.com', // Aggiunto per Twitch
    emailGoogle: 'janedoe@google.com', // Aggiunto per Google
    isAdmin: 0,
    Position: 'Milano',
    Password: 'userpassword',
    DateBorn: '1992-02-02'
  },
  {
    id: 3,
    Username: 'spotifyuser',
    emailSpotify: 'spotifyuser@spotify.com',
    emailTwitch: 'spotifyuser@Twitch.com', // Aggiunto per Twitch
    emailGoogle: 'spotifyuser@google.com', // Aggiunto per Google
    isAdmin: 0,
    Position: 'Roma',
    Password: 'spotifypass',
    DateBorn: '1988-03-03'
  }
];

let spotifyTokens = [
  {
    id: 1,
    emailSpotify: 'johndoe@spotify.com',
    token: 'valid_access_token_johndoe'
  },
  {
    id: 2,
    emailSpotify: 'janedoe@spotify.com',
    token: 'valid_access_token_janedoe'
  },
  {
    id: 3,
    emailSpotify: 'spotifyuser@spotify.com',
    token: 'valid_access_token_spotifyuser'
  }
];

let TwitchTokens = [
  {
    id: 1,
    emailTwitch: 'johndoe@Twitch.com',
    token: 'valid_access_token_johndoe_fb'
  },
  {
    id: 2,
    emailTwitch: 'janedoe@Twitch.com',
    token: 'valid_access_token_janedoe_fb'
  },
  {
    id: 3,
    emailTwitch: 'spotifyuser@Twitch.com',
    token: 'valid_access_token_spotifyuser_fb'
  }
];

let googleTokens = [ // Nuovo array per i token Google
  {
    id: 1,
    emailGoogle: 'johndoe@google.com',
    token: 'valid_access_token_johndoe_google'
  },
  {
    id: 2,
    emailGoogle: 'janedoe@google.com',
    token: 'valid_access_token_janedoe_google'
  },
  {
    id: 3,
    emailGoogle: 'spotifyuser@google.com',
    token: 'valid_access_token_spotifyuser_google'
  }
];

let userIdCounter = 4; // Inizia da 4 poiché abbiamo 3 utenti di demo
let spotifyTokenIdCounter = 4; // Inizia da 4 poiché abbiamo 3 token Spotify di demo
let TwitchTokenIdCounter = 4; // Inizia da 4 poiché abbiamo 3 token Twitch di demo
let googleTokenIdCounter = 4; // Inizia da 4 poiché abbiamo 3 token Google di demo

// Funzioni di Operazione del Database Mock
const dbMockOperations = {
  // ====================
  // Operazioni sugli Utenti
  // ====================
  getUserByUsername: (Username) => {
    const user = users.find(u => u.Username === Username) || null;
    return Promise.resolve(user);
  },

  createUser: ({ Username, emailSpotify = '', emailTwitch = '', emailGoogle = '', Position = '', Password, DateBorn = '' }) => { // Aggiunto emailGoogle
    // Controlla se lo Username esiste già
    const existingUser = users.find(u => u.Username === Username);
    if (existingUser) {
      return Promise.reject(new Error('Nome utente già in uso.'));
    }

    // Controlla se emailTwitch esiste già, se fornita
    if (emailTwitch) {
      const existingTwitchEmail = users.find(u => u.emailTwitch === emailTwitch);
      if (existingTwitchEmail) {
        return Promise.reject(new Error('Email Twitch già in uso.'));
      }
    }

    // Controlla se emailGoogle esiste già, se fornita
    if (emailGoogle) {
      const existingGoogleEmail = users.find(u => u.emailGoogle === emailGoogle);
      if (existingGoogleEmail) {
        return Promise.reject(new Error('Email Google già in uso.'));
      }
    }

    const newUser = {
      id: userIdCounter++,
      Username,
      emailSpotify,
      emailTwitch,
      emailGoogle,
      isAdmin: 0, // Default a non-admin
      Position,
      Password,
      DateBorn
    };
    users.push(newUser);
    return Promise.resolve(newUser.id);
  },

  updateUser: (id, { Username, emailSpotify = '', emailTwitch = '', emailGoogle = '', Position = '', Password, DateBorn = '', isAdmin }) => { // Aggiunto emailGoogle
    const index = users.findIndex(u => u.id === parseInt(id, 10));
    if (index === -1) return Promise.resolve(0);

    // Controlla conflitto di Username se viene aggiornato
    if (Username && Username !== users[index].Username) {
      const usernameExists = users.some(u => u.Username === Username);
      if (usernameExists) {
        return Promise.reject(new Error('Nome utente già in uso.'));
      }
    }

    // Controlla conflitto di emailTwitch se viene aggiornato
    if (emailTwitch && emailTwitch !== users[index].emailTwitch) {
      const emailTwitchExists = users.some(u => u.emailTwitch === emailTwitch);
      if (emailTwitchExists) {
        return Promise.reject(new Error('Email Twitch già in uso.'));
      }
    }

    // Controlla conflitto di emailGoogle se viene aggiornato
    if (emailGoogle && emailGoogle !== users[index].emailGoogle) {
      const emailGoogleExists = users.some(u => u.emailGoogle === emailGoogle);
      if (emailGoogleExists) {
        return Promise.reject(new Error('Email Google già in uso.'));
      }
    }

    const user = users[index];
    users[index] = {
      ...user,
      Username: Username || user.Username,
      emailSpotify: emailSpotify || user.emailSpotify,
      emailTwitch: emailTwitch || user.emailTwitch,
      emailGoogle: emailGoogle || user.emailGoogle, // Aggiornato per Google
      Position: Position || user.Position,
      Password: Password || user.Password,
      DateBorn: DateBorn || user.DateBorn,
      isAdmin: typeof isAdmin === 'number' ? isAdmin : user.isAdmin
    };
    return Promise.resolve(1);
  },

  deleteUser: (id) => {
    const user = users.find(u => u.id === parseInt(id, 10));
    if (!user) return Promise.resolve(0);

    const initialLength = users.length;
    users = users.filter(u => u.id !== parseInt(id, 10));

    // Rimuovi i token associati
    spotifyTokens = spotifyTokens.filter(t => t.emailSpotify !== user.emailSpotify);
    TwitchTokens = TwitchTokens.filter(t => t.emailTwitch !== user.emailTwitch);
    googleTokens = googleTokens.filter(t => t.emailGoogle !== user.emailGoogle); // Rimosso i token Google

    return Promise.resolve(initialLength !== users.length ? 1 : 0);
  },

  getUsers: ({ Position, DateBorn }) => {
    let result = [...users];
    if (Position) {
      result = result.filter(u => u.Position.toLowerCase().includes(Position.toLowerCase()));
    }
    if (DateBorn) {
      result = result.filter(u => u.DateBorn === DateBorn);
    }
    return Promise.resolve(result);
  },

  getUserById: (id) => {
    const user = users.find(u => u.id === parseInt(id, 10)) || null;
    return Promise.resolve(user);
  },

  getUserByEmailSpotify: (emailSpotify) => {
    const user = users.find(u => u.emailSpotify === emailSpotify) || null;
    return Promise.resolve(user);
  },

  getUserByEmailTwitch: (emailTwitch) => { // Metodo aggiunto per ottenere l'utente tramite email Twitch
    const user = users.find(u => u.emailTwitch === emailTwitch) || null;
    return Promise.resolve(user);
  },

  getUserByEmailGoogle: (emailGoogle) => { // Metodo aggiunto per ottenere l'utente tramite email Google
    const user = users.find(u => u.emailGoogle === emailGoogle) || null;
    return Promise.resolve(user);
  },

  // ====================
  // Operazioni sui Token Spotify
  // ====================
  setSpotifyTokenForUser: (emailSpotify, accessToken) => {
    // Rimuove il token esistente per l'utente
    spotifyTokens = spotifyTokens.filter(t => t.emailSpotify !== emailSpotify);
    // Aggiunge il nuovo token
    const newToken = {
      id: spotifyTokenIdCounter++,
      emailSpotify,
      token: accessToken
    };
    spotifyTokens.push(newToken);
    return Promise.resolve(newToken.id);
  },

  getSpotifyTokenByEmail: (emailSpotify) => {
    const token = spotifyTokens.find(t => t.emailSpotify === emailSpotify) || null;
    return Promise.resolve(token);
  },

  getAllSpotifyTokens: () => {
    return Promise.resolve([...spotifyTokens]);
  },

  // ====================
  // Operazioni sui Token Twitch
  // ====================
  setTwitchTokenForUser: (emailTwitch, accessToken) => { // Metodo aggiunto per Twitch
    // Rimuove il token esistente per l'utente
    TwitchTokens = TwitchTokens.filter(t => t.emailTwitch !== emailTwitch);
    // Aggiunge il nuovo token
    const newToken = {
      id: TwitchTokenIdCounter++,
      emailTwitch,
      token: accessToken
    };
    TwitchTokens.push(newToken);
    return Promise.resolve(newToken.id);
  },

  getTwitchTokenByEmail: (emailTwitch) => { // Metodo aggiunto per Twitch
    const token = TwitchTokens.find(t => t.emailTwitch === emailTwitch) || null;
    return Promise.resolve(token);
  },

  getAllTwitchTokens: () => { // Metodo aggiunto per Twitch
    return Promise.resolve([...TwitchTokens]);
  },

  // ====================
  // Operazioni sui Token Google
  // ====================
  setGoogleTokenForUser: (emailGoogle, accessToken) => { // Nuovo metodo per Google
    // Rimuove il token esistente per l'utente
    googleTokens = googleTokens.filter(t => t.emailGoogle !== emailGoogle);
    // Aggiunge il nuovo token
    const newToken = {
      id: googleTokenIdCounter++,
      emailGoogle,
      token: accessToken
    };
    googleTokens.push(newToken);
    return Promise.resolve(newToken.id);
  },

  getGoogleTokenByEmail: (emailGoogle) => { // Nuovo metodo per Google
    const token = googleTokens.find(t => t.emailGoogle === emailGoogle) || null;
    return Promise.resolve(token);
  },

  getAllGoogleTokens: () => { // Nuovo metodo per Google
    return Promise.resolve([...googleTokens]);
  },

  // ====================
  // Funzioni di Utilità
  // ====================
  reset: () => {
    users = [
      {
        id: 1,
        Username: 'johndoe',
        emailSpotify: 'johndoe@spotify.com',
        emailTwitch: 'johndoe@Twitch.com', // Aggiunto per Twitch
        emailGoogle: 'johndoe@google.com', // Aggiunto per Google
        isAdmin: 1,
        Position: 'Treviglio',
        Password: 'adminpassword',
        DateBorn: '1990-01-01'
      },
      {
        id: 2,
        Username: 'janedoe',
        emailSpotify: 'janedoe@spotify.com',
        emailTwitch: 'janedoe@Twitch.com', // Aggiunto per Twitch
        emailGoogle: 'janedoe@google.com', // Aggiunto per Google
        isAdmin: 0,
        Position: 'Milano',
        Password: 'userpassword',
        DateBorn: '1992-02-02'
      },
      {
        id: 3,
        Username: 'spotifyuser',
        emailSpotify: 'spotifyuser@spotify.com',
        emailTwitch: 'spotifyuser@Twitch.com', // Aggiunto per Twitch
        emailGoogle: 'spotifyuser@google.com', // Aggiunto per Google
        isAdmin: 0,
        Position: 'Roma',
        Password: 'spotifypass',
        DateBorn: '1988-03-03'
      }
    ];

    spotifyTokens = [
      {
        id: 1,
        emailSpotify: 'johndoe@spotify.com',
        token: 'valid_access_token_johndoe'
      },
      {
        id: 2,
        emailSpotify: 'janedoe@spotify.com',
        token: 'valid_access_token_janedoe'
      },
      {
        id: 3,
        emailSpotify: 'spotifyuser@spotify.com',
        token: 'valid_access_token_spotifyuser'
      }
    ];

    TwitchTokens = [
      {
        id: 1,
        emailTwitch: 'johndoe@Twitch.com',
        token: 'valid_access_token_johndoe_fb'
      },
      {
        id: 2,
        emailTwitch: 'janedoe@Twitch.com',
        token: 'valid_access_token_janedoe_fb'
      },
      {
        id: 3,
        emailTwitch: 'spotifyuser@Twitch.com',
        token: 'valid_access_token_spotifyuser_fb'
      }
    ];

    googleTokens = [ // Reset dei token Google
      {
        id: 1,
        emailGoogle: 'johndoe@google.com',
        token: 'valid_access_token_johndoe_google'
      },
      {
        id: 2,
        emailGoogle: 'janedoe@google.com',
        token: 'valid_access_token_janedoe_google'
      },
      {
        id: 3,
        emailGoogle: 'spotifyuser@google.com',
        token: 'valid_access_token_spotifyuser_google'
      }
    ];

    userIdCounter = 4;
    spotifyTokenIdCounter = 4;
    TwitchTokenIdCounter = 4;
    googleTokenIdCounter = 4; // Reset del contatore dei token Google
  }
};

module.exports = dbMockOperations;
