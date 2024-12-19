let users = [
  {
    id: 1,
    Username: 'johndoe',
    emailSpotify: 'johndoe@spotify.com',
    isAdmin: 1,
    Position: 'Treviglio',
    Password: 'adminpassword', // In a real scenario, passwords should be hashed
    DateBorn: '1990-01-01'
  },
  {
    id: 2,
    Username: 'janedoe',
    emailSpotify: 'janedoe@spotify.com',
    isAdmin: 0,
    Position: 'Milano',
    Password: 'userpassword',
    DateBorn: '1992-02-02'
  },
  {
    id: 3,
    Username: 'spotifyuser',
    emailSpotify: 'spotifyuser@spotify.com',
    isAdmin: 0,
    Position: 'Roma',
    Password: 'spotifypass',
    DateBorn: '1988-03-03'
  }
];

let tokens = [
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

let userIdCounter = 4; // Starting from 4 since we have 3 demo users
let tokenIdCounter = 4; // Starting from 4 since we have 3 demo tokens

// Mock Database Operation Functions
const dbMockOperations = {
  // ====================
  // User Operations
  // ====================
  getUserByUsername: (Username) => {
    const user = users.find(u => u.Username === Username) || null;
    return Promise.resolve(user);
  },

  createUser: ({ Username, emailSpotify = '', Position = '', Password, DateBorn = '' }) => {
    const existingUser = users.find(u => u.Username === Username);
    if (existingUser) {
      return Promise.reject(new Error('Nome utente già in uso.'));
    }

    const newUser = {
      id: userIdCounter++,
      Username,
      emailSpotify,
      isAdmin: 0, // Default to non-admin
      Position,
      Password,
      DateBorn
    };
    users.push(newUser);
    return Promise.resolve(newUser.id);
  },

  updateUser: (id, { Username, emailSpotify = '', Position = '', Password, DateBorn = '', isAdmin }) => {
    const index = users.findIndex(u => u.id === parseInt(id, 10));
    if (index === -1) return Promise.resolve(0);
    
    // Check for username conflict if Username is being updated
    if (Username && Username !== users[index].Username) {
      const usernameExists = users.some(u => u.Username === Username);
      if (usernameExists) {
        return Promise.reject(new Error('Nome utente già in uso.'));
      }
    }

    const user = users[index];
    users[index] = {
      ...user,
      Username: Username || user.Username,
      emailSpotify: emailSpotify || user.emailSpotify,
      Position: Position || user.Position,
      Password: Password || user.Password,
      DateBorn: DateBorn || user.DateBorn,
      isAdmin: typeof isAdmin === 'number' ? isAdmin : user.isAdmin
    };
    return Promise.resolve(1);
  },


  deleteUser: (id) => {
    const initialLength = users.length;
    users = users.filter(u => u.id !== parseInt(id, 10));
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

  // ====================
  // Token Operations
  // ====================
  setTokenForUser: (emailSpotify, accessToken) => {
    // Remove existing token for the user
    tokens = tokens.filter(t => t.emailSpotify !== emailSpotify);
    // Add new token
    const newToken = {
      id: tokenIdCounter++,
      emailSpotify,
      token: accessToken
    };
    tokens.push(newToken);
    return Promise.resolve(newToken.id);
  },

  getTokenByEmail: (emailSpotify) => {
    const token = tokens.find(t => t.emailSpotify === emailSpotify) || null;
    return Promise.resolve(token);
  },

  getAllTokens: () => {
    return Promise.resolve([...tokens]);
  },

  // ====================
  // Utility Functions
  // ====================
  reset: () => {
    users = [
      {
        id: 1,
        Username: 'johndoe',
        emailSpotify: 'johndoe@spotify.com',
        isAdmin: 1,
        Position: 'Treviglio',
        Password: 'adminpassword',
        DateBorn: '1990-01-01'
      },
      {
        id: 2,
        Username: 'janedoe',
        emailSpotify: 'janedoe@spotify.com',
        isAdmin: 0,
        Position: 'Milano',
        Password: 'userpassword',
        DateBorn: '1992-02-02'
      },
      {
        id: 3,
        Username: 'spotifyuser',
        emailSpotify: 'spotifyuser@spotify.com',
        isAdmin: 0,
        Position: 'Roma',
        Password: 'spotifypass',
        DateBorn: '1988-03-03'
      }
    ];

    tokens = [
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

    userIdCounter = 4;
    tokenIdCounter = 4;
  }
};

module.exports = dbMockOperations;
