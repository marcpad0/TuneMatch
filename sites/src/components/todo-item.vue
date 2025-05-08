<template>
  <div class="login-container"> 
    <div class="login-card">
      <h2 class="title">Registrati</h2>
      <form @submit.prevent="registerUser">
        <div class="input-group">
          <label for="username">Username</label>
          <div class="input-wrapper">
            <span class="input-icon">👤</span>
            <input
              id="username"
              v-model="username"
              type="text"
              placeholder="Inserisci il tuo username"
              required
            />
          </div>
        </div>
        <div class="input-group">
          <label for="email">Email</label>
          <div class="input-wrapper">
            <span class="input-icon">📧</span>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="Inserisci la tua email"
              required
            />
          </div>
        </div>
        <div class="input-group">
          <label for="position">Posizione</label>
          <div class="input-wrapper">
            <span class="input-icon">📍</span>
            <input
              id="position"
              v-model="position"
              type="text"
              placeholder="Inserisci la tua posizione"
              required
            />
          </div>
        </div>
        <div class="input-group">
          <label for="dateBorn">Data di Nascita</label>
          <div class="input-wrapper">
            <span class="input-icon">🗓️</span>
            <input 
              id="dateBorn" 
              v-model="dateBorn" 
              type="date" 
              required 
            />
          </div>
        </div>
        <div class="input-group">
          <label for="password">Password</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="Inserisci la tua password"
              required
            />
          </div>
        </div>
        <button type="submit" class="login-button">
          <span>Registrati</span>
        </button>
      </form>

      <div class="divider">
        <span>oppure</span>
      </div>

      <div class="social-logins">
        <button @click="loginWithSpotify" class="spotify-button social-button">
          <span class="social-icon">🎵</span>
          Accedi con Spotify
        </button>

        <button @click="loginWithGoogle" class="google-button social-button">
          <span class="social-icon">G</span>
          Accedi con Google
        </button>
      </div>

      <p class="register-link">
        Hai già un account?
        <router-link to="/">Accedi</router-link>
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
      email: "",
      position: "",
      password: "",
      dateBorn: "",
    };
  },
  methods: {
    async registerUser() {
      try {
        const response = await axios.post("http://localhost:3000/users", {
          Username: this.username,
          Email: this.email,
          Position: this.position,
          Password: this.password,
          DateBorn: this.dateBorn,
        });
        this.$router.push("/");
      } catch (error) {
        console.error("Errore durante la registrazione:", error);
        if (error.response && error.response.status === 409) {
          alert("Registrazione fallita: Nome utente o email già in uso.");
        } else if (
          error.response &&
          error.response.data &&
          error.response.data.message
        ) {
          alert(`Registrazione fallita: ${error.response.data.message}`);
        } else {
          alert("Registrazione fallita. Riprova più tardi.");
        }
      }
    },
    loginWithSpotify() {
      window.location.href = "http://localhost:3000/auth/spotify";
    },
    loginWithTwitch() {
      window.location.href = "http://localhost:3000/auth/Twitch";
    },
    loginWithGoogle() {
      window.location.href = "http://localhost:3000/auth/google";
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
  font-family: "Quicksand", sans-serif;
}

.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 450px;
  width: 100%;
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.app-logo-icon {
  font-size: 48px;
  color: #8e44ad;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

.app-logo-text {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(45deg, #8e44ad, #3498db);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin: 10px 0;
}

.login-card {
  background-color: #ffffff;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.title {
  text-align: center;
  margin-bottom: 25px;
  color: #333333;
  font-size: 24px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  color: #555555;
  font-size: 14px;
  font-weight: 600;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: #8e44ad;
  font-size: 16px;
}

.input-group input {
  width: 100%;
  padding: 12px 15px 12px 40px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.3s ease;
  font-size: 16px;
  background-color: #f9f9f9;
}

.input-group input:focus {
  border-color: #8e44ad;
  box-shadow: 0 0 0 2px rgba(142, 68, 173, 0.2);
  outline: none;
  background-color: #fff;
}

.login-button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(45deg, #8e44ad, #9b59b6);
  border: none;
  border-radius: 12px;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-icon {
  margin-left: 8px;
  transition: transform 0.3s ease;
}

.login-button:hover {
  background: linear-gradient(45deg, #9b59b6, #8e44ad);
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(155, 89, 182, 0.3);
}

.login-button:hover .button-icon {
  transform: translateX(5px);
}

.divider {
  display: flex;
  align-items: center;
  margin: 25px 0;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid #e0e0e0;
}

.divider span {
  padding: 0 15px;
  font-size: 14px;
  color: #777;
}

.social-logins {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.social-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.social-icon {
  margin-right: 10px;
  font-size: 18px;
}

.spotify-button {
  background-color: #1DB954;
  color: white;
}

.spotify-button:hover {
  background-color: #1ed760;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(30, 215, 96, 0.3);
}

.google-button {
  background-color: #4285F4;
  color: white;
}

.google-button:hover {
  background-color: #5a95f5;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(66, 133, 244, 0.3);
}

.register-link {
  text-align: center;
  margin-top: 25px;
  color: #777777;
  font-size: 14px;
}

.register-link a {
  color: #8e44ad;
  text-decoration: none;
  font-weight: bold;
  transition: color 0.3s ease;
}

.register-link a:hover {
  color: #9b59b6;
  text-decoration: underline;
}

/* Responsiveness */
@media (max-width: 480px) {
  .login-card {
    padding: 25px 20px;
  }
  
  .app-logo-text {
    font-size: 28px;
  }
  
  .title {
    font-size: 22px;
  }
  
  .input-group label {
    font-size: 13px;
  }
  
  .input-group input {
    padding: 10px 12px 10px 36px;
    font-size: 14px;
  }
}
</style>