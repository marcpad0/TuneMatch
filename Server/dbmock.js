let users = [
  {
    id: 1,
    Username: 'johndoe',
    Email: 'john@example.com',
    emailSpotify: 'johndoe@spotify.com',
    emailTwitch: 'johndoe@Twitch.com',
    emailGoogle: 'johndoe@google.com',
    isAdmin: 1,
    Position: 'Treviglio',
    Password: 'adminpassword',
    DateBorn: '1990-01-01',
    favorite_selections: JSON.stringify(["Rock", "The Beatles"]) // Example
  },
  {
    id: 2,
    Username: 'janedoe',
    Email: 'jane@example.com',
    emailSpotify: null, // To test the new modal
    emailTwitch: 'janedoe@Twitch.com',
    emailGoogle: 'janedoe@google.com',
    isAdmin: 0,
    Position: 'Milano',
    Password: 'userpassword',
    DateBorn: '1992-02-02',
    favorite_selections: null
  },
  {
    id: 3,
    Username: 'spotifyuser',
    Email: 'spotify@example.com',
    emailSpotify: 'spotifyuser@spotify.com',
    emailTwitch: 'spotifyuser@Twitch.com',
    emailGoogle: 'spotifyuser@google.com',
    isAdmin: 0,
    Position: 'Roma',
    Password: 'spotifypass',
    DateBorn: '1988-03-03',
    favorite_selections: JSON.stringify(["Pop", "Electronic", "Dua Lipa"])
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

  createUser: ({ Username, Email = '', emailSpotify = '', emailTwitch = '', emailGoogle = '', Position = '', Password, DateBorn = '' }) => {
    // Controlla se lo Username esiste già
    const existingUser = users.find(u => u.Username === Username);
    if (existingUser) {
      return Promise.reject(new Error('Nome utente già in uso.'));
    }
  
    // Controlla se Email esiste già, se fornita
    if (Email) {
      const existingEmail = users.find(u => u.Email === Email);
      if (existingEmail) {
        return Promise.reject(new Error('Email già in uso.'));
      }
    }
  
    // Altri controlli esistenti...
  
    const newUser = {
      id: userIdCounter++,
      Username,
      Email,
      emailSpotify,
      emailTwitch,
      emailGoogle,
      isAdmin: 0,
      Position,
      Password,
      DateBorn,
      favorite_selections: null
    };
    users.push(newUser);
    return Promise.resolve(newUser.id);
  },
  
  updateUser: (id, updates) => {
    const index = users.findIndex(u => u.id === parseInt(id, 10));
    if (index === -1) return Promise.resolve(0);
  
    // Controlla conflitto di Email se viene aggiornata
    if (updates.Email && updates.Email !== users[index].Email) {
      const emailExists = users.some(u => u.Email === updates.Email);
      if (emailExists) {
        return Promise.reject(new Error('Email già in uso.'));
      }
    }
  
    const userToUpdate = users[index];
    users[index] = { ...userToUpdate, ...updates };
    if (updates.favorite_selections) {
      users[index].favorite_selections = JSON.stringify(updates.favorite_selections);
    }
    
    return Promise.resolve(1);
  },
  
  getUserByEmail: (Email) => {
    const user = users.find(u => u.Email === Email) || null;
    return Promise.resolve(user);
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
    if (user && user.favorite_selections && typeof user.favorite_selections === 'string') {
      // Ensure it's parsed if it was stringified
      // This is more for consistency if other parts of mock DB don't stringify/parse
    }
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

  // Add a new function to specifically update favorite selections
  setUserFavoriteSelections: (userId, favorites) => {
    const index = users.findIndex(u => u.id === parseInt(userId, 10));
    if (index === -1) {
      return Promise.resolve(0);
    }
    users[index].favorite_selections = JSON.stringify(favorites);
    return Promise.resolve(1);
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
        emailTwitch: 'johndoe@Twitch.com', 
        emailGoogle: 'johndoe@google.com', 
        isAdmin: 1,
        Position: 'Treviglio',
        Password: 'adminpassword',
        DateBorn: '1990-01-01',
        favorite_selections: JSON.stringify(["Rock", "The Beatles"])
      },
      {
        id: 2,
        Username: 'janedoe',
        emailSpotify: null,
        emailTwitch: 'janedoe@Twitch.com', 
        emailGoogle: 'janedoe@google.com',        
        isAdmin: 0,
        Position: 'Milano',
        Password: 'userpassword',
        DateBorn: '1992-02-02',
        favorite_selections: null
      },
      {
        id: 3,
        Username: 'spotifyuser',
        emailSpotify: 'spotifyuser@spotify.com',
        emailTwitch: 'spotifyuser@Twitch.com',        
        emailGoogle: 'spotifyuser@google.com',        
        isAdmin: 0,
        Position: 'Roma',
        Password: 'spotifypass',
        DateBorn: '1988-03-03',
        favorite_selections: JSON.stringify(["Pop"])
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
