<template>
  <div class="userlist-container">
    <div class="userlist-card">
      <div class="header-section">
        <h2 class="title">Lista Utenti</h2>
        <button class="filter-button" @click="logout">Logout</button>
      </div>

      <div class="filters">
        <h3 class="subtitle">Filtra Utenti</h3>
        <form @submit.prevent="applicaFiltri">
          <div class="filters-grid">
            <div class="input-group">
              <label for="position">Posizione:</label>
              <input
                id="position"
                v-model="filtri.Position"
                placeholder="es. Bergamo"
                class="cute-input"
              />
            </div>
            <div class="input-group">
              <label for="dateBorn">Data di Nascita:</label>
              <input
                type="date"
                id="dateBorn"
                v-model="filtri.DateBorn"
                class="cute-input"
              />
            </div>
          </div>
          <div class="filter-buttons">
            <button type="submit" class="filter-button">Applica Filtri</button>
            <button type="button" class="filter-button" @click="resettaFiltri">
              Reset Filtri
            </button>
          </div>
        </form>
      </div>

      <!-- Mobile Cards -->
      <div class="user-cards-mobile">
        <div
          v-for="utente in utentiFiltrati"
          :key="utente.id"
          class="user-card"
        >
          <div class="user-card-header">
            <strong>{{ utente.Username }}</strong>
            <div class="user-actions">
              <button
                v-if="puòModificare(utente)"
                class="action-button"
                @click="modificaUtente(utente)"
              >
                Modifica
              </button>
              <button
                v-if="puòCancellare(utente)"
                class="action-button delete-button"
                @click="cancellaUtente(utente.id)"
              >
                Cancella
              </button>
            </div>
          </div>
          <div class="user-card-content">
            <p><strong>Email Spotify:</strong> {{ utente.emailSpotify }}</p>
            <p><strong>Email Google:</strong> {{ utente.emailGoogle }}</p>
            <p><strong>Posizione:</strong> {{ utente.Position }}</p>
            <p><strong>Data di Nascita:</strong> {{ utente.DateBorn }}</p>
            <p class="status-line">
              <strong>Status:</strong>
              <span
                v-if="getUserStatus(utente.id).online"
                class="status-indicator online"
              ></span>
              <span v-else class="status-indicator offline"></span>
              <span v-if="getUserStatus(utente.id).online">Online</span>
              <span v-else>Offline</span>
            </p>
            <div
              v-if="getUserStatus(utente.id).listening"
              class="listening-container"
            >
              <strong><i class="fas fa-headphones"></i> Listening to:</strong>
              <span class="listening-text">
                {{ getUserStatus(utente.id).listening.trackName }} by
                {{ getUserStatus(utente.id).listening.artists }}
              </span>
            </div>
            <!-- If no track is playing, show blank space -->
            <div v-else style="min-height: 20px"></div>
          </div>
        </div>
      </div>

      <!-- Desktop Table -->
      <div class="table-responsive desktop-only">
        <table class="user-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email Spotify</th>
              <th>Email Google</th>
              <th>Posizione</th>
              <th>Data di Nascita</th>
              <th>Status</th>
              <th>Listening</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="utente in utentiFiltrati" :key="utente.id">
              <td>{{ utente.Username }}</td>
              <td>{{ utente.emailSpotify }}</td>
              <td>{{ utente.emailGoogle }}</td>
              <td>{{ utente.Position }}</td>
              <td>{{ utente.DateBorn }}</td>
              <td>
                <span class="status-line">
                  <span
                    v-if="getUserStatus(utente.id).online"
                    class="status-indicator online"
                  ></span>
                  <span v-else class="status-indicator offline"></span>
                  <span v-if="getUserStatus(utente.id).online">Online</span>
                  <span v-else>Offline</span>
                </span>
              </td>
              <td>
                <div
                  v-if="getUserStatus(utente.id).listening"
                  class="listening-container"
                >
                  <strong><i class="fas fa-headphones"></i> </strong>
                  <span class="listening-text">
                    {{ getUserStatus(utente.id).listening.trackName }} by
                    {{ getUserStatus(utente.id).listening.artists }}
                  </span>
                </div>
              </td>
              <td>
                <button
                  v-if="puòModificare(utente)"
                  class="action-button"
                  @click="modificaUtente(utente)"
                >
                  Modifica
                </button>
                <button
                  v-if="puòCancellare(utente)"
                  class="action-button delete-button"
                  @click="cancellaUtente(utente.id)"
                >
                  Cancella
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Favorite Tracks -->
      <div class="favorite-tracks-section">
        <h3 class="subtitle">Brani Preferiti</h3>
        <div class="favorites-grid">
          <div
            v-for="track in favorites"
            :key="track.id"
            class="favorite-track-card"
            @click="openSpotifyTrack(track)"
          >
            <img
              v-if="track.album && track.album.images && track.album.images[0]"
              :src="track.album.images[0].url"
              alt="Album Art"
              class="album-art"
            />
            <div class="track-info">
              <h4>{{ track.name }}</h4>
              <p>
                <strong>Artista:</strong> {{ getArtistNames(track.artists) }}
              </p>
              <p><strong>Album:</strong> {{ track.album.name }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Edit User -->
      <div v-if="mostraModaleModifica" class="modal">
        <div class="modal-content">
          <span class="close" @click="chiudiModale">&times;</span>
          <h3 class="modal-title">Modifica Utente</h3>
          <form @submit.prevent="aggiornaUtente">
            <div class="modal-grid">
              <div class="input-group">
                <label for="editUsername">Username:</label>
                <input
                  id="editUsername"
                  v-model="utenteModificabile.Username"
                  required
                  class="cute-input"
                />
              </div>
              <div class="input-group">
                <label for="editEmailSpotify">Email Spotify:</label>
                <input
                  id="editEmailSpotify"
                  v-model="utenteModificabile.emailSpotify"
                  class="cute-input"
                />
              </div>
              <div class="input-group">
                <label for="editEmailGoogle">Email Google:</label>
                <input
                  id="editEmailGoogle"
                  v-model="utenteModificabile.emailGoogle"
                  class="cute-input"
                />
              </div>
              <div class="input-group">
                <label for="editPosition">Posizione:</label>
                <input
                  id="editPosition"
                  v-model="utenteModificabile.Position"
                  class="cute-input"
                />
              </div>
              <div class="input-group">
                <label for="editPassword">Password:</label>
                <input
                  id="editPassword"
                  type="password"
                  v-model="utenteModificabile.Password"
                  required
                  class="cute-input"
                />
              </div>
              <div class="input-group">
                <label for="editDateBorn">Data di Nascita:</label>
                <input
                  id="editDateBorn"
                  type="date"
                  v-model="utenteModificabile.DateBorn"
                  class="cute-input"
                />
              </div>
            </div>
            <button type="submit" class="modal-button">Salva Modifiche</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "UserList",
  data() {
    return {
      utenti: [],
      utentiFiltrati: [],
      userData: null,
      mostraModaleModifica: false,
      utenteModificabile: {},
      filtri: {
        Position: "",
        DateBorn: "",
      },
      favorites: [],
      userId: null,
      statuses: [],
    };
  },
  methods: {
    async getUserData() {
      try {
        const response = await axios.get("http://localhost:3000/auth/me", {
          withCredentials: true,
        });
        this.userData = response.data;
        this.userId = this.userData.userId.toString();
      } catch (error) {
        console.error("Errore nel recupero dei dati utente:", error);
        this.$router.push("/");
      }
    },
    async recuperaUtenti() {
      try {
        const response = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("GET", "http://localhost:3000/users", true);
          xhr.withCredentials = true;
          xhr.setRequestHeader("userId", this.userId);

          xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(xhr.statusText));
            }
          };

          xhr.onerror = function () {
            reject(new Error("Network Error"));
          };

          xhr.send();
        });

        // Filter out admin users before setting the users list
        this.utenti = response.filter((user) => !user.isAdmin);
        this.utenti = this.utenti.filter((user) => !user.emailTwitch);
        this.utentiFiltrati = this.utenti;
      } catch (error) {
        console.error("Errore nel recupero degli utenti:", error);
        alert("Impossibile recuperare gli utenti.");
      }
    },
    puòModificare(utente) {
      return utente.id === this.userData?.userId;
    },
    puòCancellare(utente) {
      return utente.id === this.userData?.userId;
    },
    modificaUtente(utente) {
      if (this.puòModificare(utente)) {
        this.utenteModificabile = { ...utente };
        this.mostraModaleModifica = true;
      } else {
        alert("Non hai i permessi per modificare questo utente.");
      }
    },
    chiudiModale() {
      this.mostraModaleModifica = false;
      this.utenteModificabile = {};
    },
    async aggiornaUtente() {
      try {
        await axios.put(
          `http://localhost:3000/users/${this.utenteModificabile.id}`,
          {
            Username: this.utenteModificabile.Username,
            emailSpotify: this.utenteModificabile.emailSpotify,
            emailGoogle: this.utenteModificabile.emailGoogle,
            Position: this.utenteModificabile.Position,
            Password: this.utenteModificabile.Password,
            DateBorn: this.utenteModificabile.DateBorn,
          },
          {
            headers: {
              userId: this.userId,
            },
            withCredentials: true,
          }
        );

        alert("Utente aggiornato con successo.");
        this.chiudiModale();
        this.recuperaUtenti();
      } catch (error) {
        console.error("Errore nell'aggiornamento dell'utente:", error);
        if (
          error.response &&
          error.response.data &&
          error.response.data.message
        ) {
          alert(
            `Impossibile aggiornare l'utente: ${error.response.data.message}`
          );
        } else {
          alert(`Impossibile aggiornare l'utente: ${error.message}`);
        }
      }
    },
    async cancellaUtente(id) {
      if (!confirm(`Sei sicuro di voler eliminare il tuo account?`)) {
        return;
      }

      try {
        await axios.delete(`http://localhost:3000/users/${id}`, {
          headers: {
            userId: this.userId,
          },
          withCredentials: true,
        });

        if (id === parseInt(this.userId)) {
          alert(
            "Il tuo account è stato eliminato. Effettua il login di nuovo."
          );
          this.logout();
        } else {
          alert(`Utente con ID "${id}" eliminato con successo.`);
          this.recuperaUtenti();
        }
      } catch (error) {
        console.error("Errore nell'eliminazione dell'utente:", error);
        if (
          error.response &&
          error.response.data &&
          error.response.data.message
        ) {
          alert(
            `Impossibile eliminare l'utente: ${error.response.data.message}`
          );
        } else {
          alert(`Impossibile eliminare l'utente: ${error.message}`);
        }
      }
    },
    async logout() {
      try {
        await axios.post(
          "http://localhost:3000/logout",
          {},
          {
            withCredentials: true,
          }
        );
        this.$router.push("/");
      } catch (error) {
        console.error("Logout error:", error);
        alert("Errore durante il logout.");
      }
    },
    applicaFiltri() {
      const xhr = new XMLHttpRequest();
      const queryParams = new URLSearchParams();

      if (this.filtri.Position) {
        queryParams.append("Position", this.filtri.Position);
      }

      if (this.filtri.DateBorn) {
        queryParams.append("DateBorn", this.filtri.DateBorn);
      }

      xhr.open(
        "GET",
        `http://localhost:3000/users?${queryParams.toString()}`,
        true
      );
      xhr.withCredentials = true;
      xhr.setRequestHeader("userId", this.userId);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Filter out admin users from the filtered results
          this.utentiFiltrati = JSON.parse(xhr.responseText).filter(
            (user) => !user.isAdmin
          );
        } else {
          console.error("Error applying filters:", xhr.statusText);
          alert("Errore durante l'applicazione dei filtri.");
        }
      };

      xhr.onerror = () => {
        console.error("Request failed");
        alert("Errore di rete durante l'applicazione dei filtri.");
      };

      xhr.send();
    },
    resettaFiltri() {
      this.filtri.Position = "";
      this.filtri.DateBorn = "";
      this.utentiFiltrati = this.utenti;
    },
    favorite() {
      axios
        .get("http://localhost:3000/favorites", {
          withCredentials: true,
        })
        .then((response) => {
          this.favorites = response.data;
        })
        .catch((error) => {
          console.error("Errore nel recupero dei brani preferiti:", error);
        });
    },
    openSpotifyTrack(track) {
      if (track && track.external_urls && track.external_urls.spotify) {
        window.open(track.external_urls.spotify, "_blank");
      } else {
        alert("Link Spotify non disponibile per questo brano.");
      }
    },
    getArtistNames(artists) {
      if (!artists || artists.length === 0) return "Artista sconosciuto";
      return artists.map((artist) => artist.name).join(", ");
    },
    getUserStatus(userId) {
      const status = this.statuses.find((s) => s.userId == userId);
      return status || {};
    },
    setupWebSocket() {
      const ws = new WebSocket("ws://localhost:3000");

      ws.onopen = () => {
        console.log("WebSocket connection established.");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "status_update") {
          this.statuses = data.data;
        }
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed. Reconnecting in 5s...");
        setTimeout(() => this.setupWebSocket(), 5000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      this.ws = ws;
    },
  },
  mounted() {
    this.getUserData().then(() => {
      this.recuperaUtenti();
      this.favorite();
      this.setupWebSocket();
    });
  },
};
</script>

<style scoped>
/* Applica box-sizing globalmente */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Padding del Contenitore */
.userlist-container {
  padding: 20px;
}

.userlist-card {
  background-color: #ffffff;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  margin: 20px 0;
}

.header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  margin-bottom: 40px;
}

.title {
  font-size: 24px;
  margin: 0;
}

/* Sezione Filtri */
.filters {
  margin-bottom: 40px;
}

.subtitle {
  font-size: 20px;
  margin-bottom: 20px;
}

.filters-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
  margin-bottom: 20px;
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
}

/* Utenti Mobile */
.user-cards-mobile {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
  margin-bottom: 40px;
}

/* Card Utente */
.user-card {
  background-color: #fdfdfd;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 25px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.user-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.user-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 20px;
}

.user-card-content {
  display: grid;
  gap: 15px;
}

.user-card-content p {
  margin: 0;
  font-size: 16px;
}

/* Status Indicator */
.status-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.status-indicator.online {
  background-color: #2ecc71;
  /* Green */
}

.status-indicator.offline {
  background-color: #e74c3c;
  /* Red */
}

/* Listening Container */
.listening-container {
  display: inline-block;
  background-color: #e8f7ff;
  border: 1px solid #b2dff0;
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 5px;
  animation: fadeIn 0.6s ease;
}

.listening-container i {
  margin-right: 5px;
  color: #3498db;
}

.listening-text {
  font-weight: 500;
}

/* Keyframes for fade-in animation */
@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translateY(-4px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Azioni Utente */
.user-actions {
  display: flex;
  gap: 20px;
}

.action-button {
  background-color: #ffda79;
  border: none;
  padding: 12px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.action-button:hover {
  background-color: #ffcc66;
}

.delete-button {
  background-color: #ff6b6b;
  color: white;
}

.delete-button:hover {
  background-color: #ff4d4d;
}

/* Tabella Desktop */
.table-responsive {
  margin-bottom: 40px;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
}

.user-table th,
.user-table td {
  padding: 15px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.user-table th {
  background-color: #f5f5f5;
  font-size: 16px;
}

.user-table td {
  font-size: 15px;
}

/* Sezione Preferiti */
.favorite-tracks-section {
  margin-bottom: 40px;
}

.favorite-tracks-section .subtitle {
  margin-bottom: 20px;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 30px;
}

.favorite-track-card {
  background-color: #fdfdfd;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.favorite-track-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.album-art {
  width: 100%;
  height: auto;
  border-radius: 12px;
  margin-bottom: 15px;
}

.track-info h4 {
  margin: 10px 0 5px;
  font-size: 18px;
}

.track-info p {
  margin: 5px 0;
  font-size: 14px;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  z-index: 1000;
}

.modal-content {
  background-color: #ffffff;
  padding: 30px;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  position: relative;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.close {
  position: absolute;
  top: 15px;
  right: 20px;
  font-size: 24px;
  cursor: pointer;
}

.modal-title {
  margin-top: 0;
  margin-bottom: 25px;
  font-size: 22px;
}

.modal-button {
  background-color: #8e44ad;
  color: #ffffff;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 20px;
}

.modal-button:hover {
  background-color: #85c1e9;
}

/* Input Stili */
.cute-input {
  width: 100%;
  max-width: 100%;
  padding: 12px 16px;
  border: 1px solid #ccc;
  border-radius: 12px;
  font-size: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  background-color: #fafafa;
}

.cute-input:focus {
  border-color: #8e44ad;
  box-shadow: 0 0 8px rgba(163, 212, 247, 0.5);
  outline: none;
}

/* Pulsanti Filtri */
.filter-buttons {
  display: flex;
  gap: 30px;
  margin-top: 20px;
}

.filter-button {
  background-color: #8e44ad;
  color: #ffffff;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.filter-button:hover {
  background-color: #85c1e9;
}

/* Responsive */
.desktop-only {
  display: none;
}

@media (min-width: 768px) {
  .header-section {
    flex-direction: row;
    justify-content: space-between;
    gap: 40px;
  }

  .filters-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .modal-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .user-cards-mobile {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .user-cards-mobile {
    display: none;
  }

  .desktop-only {
    display: block;
  }

  .modal-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 480px) {
  .userlist-card {
    padding: 20px;
  }

  .filter-buttons {
    flex-direction: column;
    width: 100%;
    gap: 20px;
  }

  .filter-button {
    width: 100%;
    padding: 12px 24px;
  }

  .modal-content {
    padding: 20px;
    margin: 20px;
    width: auto;
  }

  .input-group input {
    padding: 12px 16px;
  }

  .favorite-tracks-section {
    margin-bottom: 20px;
  }

  .favorite-track-card {
    padding: 15px;
  }

  .album-art {
    margin-bottom: 10px;
  }

  .track-info h4 {
    font-size: 16px;
  }

  .track-info p {
    font-size: 13px;
  }
}
</style>
