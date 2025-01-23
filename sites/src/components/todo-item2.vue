<!-- src/components/Login.vue -->
<template>
  <div class="login-container">
    <div class="login-card">
      <h2 class="title">Accedi</h2>
      <form @submit.prevent="loginUser">
        <div class="input-group">
          <label for="username">Username</label>
          <input id="username" v-model="username" type="text" placeholder="Inserisci il tuo username" required />
        </div>
        <div class="input-group">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" placeholder="Inserisci la tua password" required />
        </div>
        <button type="submit" class="login-button">Login</button>
      </form>

      <!-- Pulsante per il login con Spotify -->
      <div class="spotify-login">
        <button @click="loginWithSpotify" class="spotify-button">
          <img src="../assets/spotify-logo.png" alt="Spotify Logo" />
          Accedi con Spotify
        </button>
      </div>

      <!-- Add this after Spotify login button -->
      <div class="Twitch-login">
        <button @click="loginWithTwitch" class="Twitch-button">
          <img src="../assets/twitch-logo.png" alt="Twitch Logo" />
          Accedi con Twitch
        </button>
      </div>

      <!-- Add this after Twitch login button -->
      <div class="google-login">
        <button @click="loginWithGoogle" class="google-button">
          <img src="../assets/google-logo.png" alt="Google Logo" />
          Accedi con Google
        </button>
      </div>

      <p class="register-link">
        Non hai un account?
        <router-link to="/register">Registrati</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "todo-item",
  data() {
    return {
      username: "",
      password: "",
    };
  },
  methods: {
    // Inside the loginUser method in todo-item2.vue
    async loginUser() {
      try {
        await axios.post("http://37.27.206.153:3000/login", {
          Username: this.username,
          Password: this.password,
        }, {
          withCredentials: true // Important for cookies
        });

        // Redirect to UserList
        this.$router.push("/users");
      } catch (error) {
        console.error(error);
        if (error.response?.data?.message) {
          alert(`Login fallito: ${error.response.data.message}`);
        } else {
          alert(`Login fallito: ${error.message}`);
        }
      }
    },
    loginWithSpotify() {
      window.location.href = "http://37.27.206.153:3000/login/spotify";
    },
    loginWithTwitch() {
      window.location.href = "http://37.27.206.153:3000/login/twitch";
    },
    loginWithGoogle() {
      window.location.href = "http://37.27.206.153:3000/login/google";
    },
  },
};
</script>

<style scoped>
/* Reset di base per garantire la coerenza tra i browser */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body,
html {
  height: 100%;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #71b7e6, #9b59b6);
}

.spotify-login {
  text-align: center;
  margin: 20px 0;
}

.spotify-button {
  background-color: #1DB954;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.google-button {
  background-color: #ffffff;
  color: #444444;
  border: 1px solid #cccccc;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.google-button img {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.google-login {
  text-align: center;
  margin: 10px 0;
}

.google-button {
  background-color: #ffffff;
  border: 1px solid #4285f4;
  color: #4285f4;
}

.google-button:hover {
  background-color: #4285f4;
  color: #ffffff;
  border-color: #4285f4;
}

.spotify-button img {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.spotify-button:hover {
  background-color: #1ed760;
}

.Twitch-login {
  text-align: center;
  margin: 20px 0;
}

.Twitch-button {
  background-color: #6441A5;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.Twitch-button img {
  width: 30px;
  height: auto;
  margin-right: 8px;
  object-fit: contain;
}

.Twitch-button:hover {
  background-color: #7D5BBE;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.login-card {
  background-color: #ffffff;
  padding: 40px 30px;
  border-radius: 10px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 400px;
  animation: fadeIn 1s ease-in-out;
}

.title {
  text-align: center;
  margin-bottom: 30px;
  color: #333333;
}

.input-group {
  margin-bottom: 20px;
  position: relative;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  color: #555555;
  font-size: 14px;
}

.input-group input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #cccccc;
  border-radius: 5px;
  transition: border-color 0.3s ease;
  font-size: 16px;
}

.input-group input:focus {
  border-color: #9b59b6;
  outline: none;
}

.login-button {
  width: 100%;
  padding: 12px;
  background-color: #9b59b6;
  border: none;
  border-radius: 5px;
  color: #ffffff;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.login-button:hover {
  background-color: #8e44ad;
}

.register-link {
  text-align: center;
  margin-top: 20px;
  color: #777777;
  font-size: 14px;
}

.register-link a {
  color: #9b59b6;
  text-decoration: none;
  font-weight: bold;
  transition: color 0.3s ease;
}

.register-link a:hover {
  color: #8e44ad;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsività */
@media (max-width: 480px) {
  .login-card {
    padding: 30px 20px;
  }

  .title {
    font-size: 24px;
  }

  .input-group label {
    font-size: 13px;
  }

  .input-group input {
    font-size: 14px;
    padding: 10px 12px;
  }

  .login-button {
    font-size: 14px;
    padding: 10px;
  }

  .register-link {
    font-size: 13px;
  }
}
</style>
