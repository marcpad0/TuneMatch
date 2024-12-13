<!-- src/components/Register.vue -->
<template>
  <div class="login-container">
    <div class="login-card">
      <h2 class="title">Registrati</h2>
      <form @submit.prevent="registerUser">
        <div class="input-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Inserisci il tuo username"
            required
          />
        </div>
        <div class="input-group">
          <label for="emailSpotify">Email Spotify</label>
          <input
            id="emailSpotify"
            v-model="emailSpotify"
            type="email"
            placeholder="Inserisci la tua email di Spotify"
            required
          />
        </div>
        <div class="input-group">
          <label for="position">Posizione</label>
          <input
            id="position"
            v-model="position"
            type="text"
            placeholder="Inserisci la tua posizione"
            required
          />
        </div>
        <div class="input-group">
          <label for="dateBorn">Data di Nascita</label>
          <input
            id="dateBorn"
            v-model="dateBorn"
            type="date"
            required
          />
        </div>
        <div class="input-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Inserisci la tua password"
            required
          />
        </div>
        <button type="submit" class="login-button">Registrati</button>
      </form>

      <!-- Pulsante per il login con Spotify -->
      <div class="spotify-login">
        <button @click="loginWithSpotify" class="spotify-button">
          <img src="../assets/spotify-logo.png" alt="Spotify Logo" />
          Accedi con Spotify
        </button>
      </div>


      <p class="register-link">
        Hai già un account?
        <router-link to="/login">Accedi</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "tofo-item",
  data() {
    return {
      username: "",
      emailSpotify: "",  
      position: "",
      password: "",
      dateBorn: "",
    };
  },
  methods: {
    async registerUser() {
      try {
        const response = await axios.post("http://37.27.206.153:3000/users", {
          Username: this.username,
          emailSpotify: this.emailSpotify,
          Position: this.position,
          Password: this.password,
          DateBorn: this.dateBorn,
        });
        alert(`Utente registrato con successo con ID: ${response.data.message}`);
        this.$router.push('/');
      } catch (error) {
        console.error("Errore durante la registrazione:", error);
        if (error.response && error.response.status === 409) {
          alert('Registrazione fallita: Nome utente già in uso.');
        } else if (error.response && error.response.data && error.response.data.message) {
          alert(`Registrazione fallita: ${error.response.data.message}`);
        } else {
          alert('Registrazione fallita. Riprova più tardi.');
        }
      }
    },
    loginWithSpotify() {
      window.location.href = "http://37.27.206.153:3000/auth/spotify";
    },
  },
};
</script>

<style scoped>
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

.spotify-button img {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.spotify-button:hover {
  background-color: #1ed760;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body, html {
  height: 100%;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #71b7e6, #9b59b6);
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
