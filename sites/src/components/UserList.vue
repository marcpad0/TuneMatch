<!-- src/components/UserList.vue -->
<template>
  <div class="userlist-container">
    <div class="userlist-card">
      <!-- Sezione Intestazione con Layout Responsivo -->
      <div class="header-section">
        <h2 class="title">Lista Utenti</h2>
        <button class="filter-button" @click="logout">Logout</button>
      </div>

      <!-- Sezione di Filtro -->
      <div class="filters">
        <h3 class="subtitle">Filtra Utenti</h3>
        <form @submit.prevent="applicaFiltri">
          <div class="filters-grid">
            <div class="input-group">
              <label for="position">Posizione:</label>
              <input
                id="position"
                v-model="filtri.Posizione"
                placeholder="es. Bergamo"
                class="cute-input"
              />
            </div>
            <div class="input-group">
              <label for="dateBorn">Data di Nascita:</label>
              <input
                type="date"
                id="dateBorn"
                v-model="filtri.DataNascita"
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

      <!-- Card Utenti Mobile -->
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
            <p><strong>Posizione:</strong> {{ utente.Posizione }}</p>
            <p><strong>Data di Nascita:</strong> {{ utente.DataNascita }}</p>
          </div>
        </div>
      </div>

      <!-- Tabella Desktop -->
      <div class="table-responsive desktop-only">
        <table class="user-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email Spotify</th>
              <th>Posizione</th>
              <th>Data di Nascita</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="utente in utentiFiltrati" :key="utente.id">
              <td>{{ utente.Username }}</td>
              <td>{{ utente.emailSpotify }}</td>
              <td>{{ utente.Posizione }}</td>
              <td>{{ utente.DataNascita }}</td>
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

      <!-- Modal di Modifica Utente -->
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
                <label for="editPosition">Posizione:</label>
                <input
                  id="editPosition"
                  v-model="utenteModificabile.Posizione"
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
                  v-model="utenteModificabile.DataNascita"
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
        Posizione: "",
        DataNascita: "",
      },
    };
  },
  methods: {
    // Verifica se l'utente può modificare
    puòModificare(utente) {
      return utente.id === this.userData?.userId;
    },
    // Verifica se l'utente può cancellare
    puòCancellare(utente) {
      return utente.id === this.userData?.userId;
    },
    // Recupera gli utenti
    async recuperaUtenti() {
      try {
        this.userId = localStorage.getItem("userId");

        // Recupera tutti gli utenti
        const response = await axios.get("http://37.27.206.153:3000/users", {
          headers: {
            userId: this.userId,
          },
        });

        this.utenti = response.data;
        this.utentiFiltrati = this.utenti; // Inizializza utentiFiltrati
      } catch (error) {
        console.error("Errore nel recupero degli utenti:", error);
        alert("Impossibile recuperare gli utenti.");
      }
    },
    // Modifica un utente
    modificaUtente(utente) {
      if (this.puòModificare(utente)) {
        // Clona l'oggetto utente per evitare di mutare i dati originali
        this.utenteModificabile = { ...utente };
        this.mostraModaleModifica = true;
      } else {
        alert("Non hai i permessi per modificare questo utente.");
      }
    },
    // Chiudi il modal
    chiudiModale() {
      this.mostraModaleModifica = false;
      this.utenteModificabile = {};
    },
    // Aggiorna un utente
    async aggiornaUtente() {
      try {
        await axios.put(
          `http://37.27.206.153:3000/users/${this.utenteModificabile.id}`,
          {
            Username: this.utenteModificabile.Username,
            emailSpotify: this.utenteModificabile.emailSpotify,
            Posizione: this.utenteModificabile.Posizione,
            Password: this.utenteModificabile.Password,
            DataNascita: this.utenteModificabile.DataNascita,
          },
          {
            headers: {
              userId: this.userId,
            },
          }
        );

        alert("Utente aggiornato con successo.");
        this.chiudiModale();
        this.recuperaUtenti(); // Aggiorna la lista degli utenti
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
    // Cancella un utente
    async cancellaUtente(id) {
      if (!confirm(`Sei sicuro di voler eliminare il tuo account?`)) {
        return;
      }

      try {
        await axios.delete(`http://37.27.206.153:3000/users/${id}`, {
          headers: {
            userId: this.userId,
          },
        });

        // Verifica se l'utente eliminato è se stesso
        if (id === parseInt(this.userId)) {
          alert(
            "Il tuo account è stato eliminato. Effettua il login di nuovo."
          );
          this.logout(); // Esegui il logout e reindirizza alla pagina di login
        } else {
          alert(`Utente con ID "${id}" eliminato con successo.`);
          this.recuperaUtenti(); // Aggiorna la lista degli utenti
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
    // Logout
    async logout() {
      try {
        await axios.post('http://37.27.206.153:3000/logout', {}, {
          withCredentials: true
        });
        this.$router.push("/");
      } catch (error) {
        console.error('Logout error:', error);
      }
    },
    // Applica i filtri
    applicaFiltri() {
      this.utentiFiltrati = this.utenti.filter((utente) => {
        const corrispondePosizione = this.filtri.Posizione
          ? utente.Posizione.toLowerCase().includes(
              this.filtri.Posizione.toLowerCase()
            )
          : true;
        const corrispondeDataNascita = this.filtri.DataNascita
          ? utente.DataNascita === this.filtri.DataNascita
          : true;
        return corrispondePosizione && corrispondeDataNascita;
      });
    },
    // Resetta i filtri
    resettaFiltri() {
      this.filtri.Posizione = "";
      this.filtri.DataNascita = "";
      this.utentiFiltrati = this.utenti;
    },

    favorite() {
      axios
        .get("http://37.27.206.153:3000/favorites", {
          withCredentials: true, // Include cookies
        })
        .then((response) => {
          alert("Top Tracks:", response.data);
        })
        .catch((error) => {
          alert("Error fetching favorites:", error);
        });
    },

    async getUserData() {
      try {
        const response = await axios.get('http://37.27.206.153:3000/auth/me', {
          withCredentials: true
        });
        this.userData = response.data;
      } catch (error) {
        this.$router.push("/");
      }
    },
  },
  mounted() {
    this.getUserData();
    this.recuperaUtenti();
    this.favorite();
  },
};
</script>

<style scoped>
/* Applica box-sizing globalmente all'interno di questo componente */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Padding del Contenitore */
.userlist-container {
  padding: 20px;
}

/* Spaziatura della Card */
.userlist-card {
  background-color: #ffffff;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  margin: 20px 0; /* Margine aumentato per più distanza */
}

/* Sezione Intestazione */
.header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px; /* Spaziatura aumentata tra gli elementi dell'intestazione */
  margin-bottom: 40px; /* Margine inferiore aumentato */
}

.title {
  font-size: 24px;
  margin: 0;
}

/* Sezione Filtri */
.filters {
  margin-bottom: 40px; /* Margine inferiore aumentato */
}

.subtitle {
  font-size: 20px;
  margin-bottom: 20px;
}

/* Griglia dei Filtri */
.filters-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px; /* Spaziatura aumentata tra gli input dei filtri */
  margin-bottom: 20px;
}

/* Griglia del Modal */
.modal-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px; /* Spaziatura aumentata tra gli input del modal */
}

/* Card Utenti Mobile */
.user-cards-mobile {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px; /* Spaziatura aumentata tra le card degli utenti */
  margin-bottom: 40px; /* Margine inferiore aumentato */
}

/* Stile della Card Utente */
.user-card {
  background-color: #fdfdfd; /* Sfondo leggermente diverso per contrasto */
  border: 1px solid #e0e0e0;
  border-radius: 16px; /* Raggio del bordo aumentato per un aspetto più gradevole */
  padding: 25px; /* Padding aumentato per una sensazione più spaziosa */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.05); /* Ombra più morbida */
  transition: transform 0.3s ease, box-shadow 0.3s ease; /* Effetto hover migliorato */
}

.user-card:hover {
  transform: translateY(-6px); /* Sollevamento leggermente maggiore al passaggio del mouse */
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1); /* Ombra migliorata al passaggio del mouse */
}

.user-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px; /* Margine aumentato */
  flex-wrap: wrap;
  gap: 20px; /* Spaziatura aumentata */
}

.user-card-content {
  display: grid;
  gap: 15px; /* Spaziatura aumentata tra il contenuto della card */
}

.user-card-content p {
  margin: 0;
  font-size: 16px; /* Dimensione del carattere aumentata per una migliore leggibilità */
}

/* Azioni Utente */
.user-actions {
  display: flex;
  gap: 20px; /* Spaziatura aumentata tra i pulsanti */
}

/* Pulsanti di Azione */
.action-button {
  background-color: #ffda79;
  border: none;
  padding: 12px 20px; /* Padding aumentato */
  border-radius: 10px; /* Angoli arrotondati */
  cursor: pointer;
  font-size: 16px; /* Dimensione del carattere aumentata */
  transition: background-color 0.3s ease;
}

.action-button:hover {
  background-color: #ffcc66; /* Leggero cambiamento del colore al passaggio del mouse */
}

.delete-button {
  background-color: #ff6b6b; /* Colore brillante per il pulsante di cancellazione */
  color: white;
}

.delete-button:hover {
  background-color: #ff4d4d; /* Leggero cambiamento del colore al passaggio del mouse */
}

/* Tabella Desktop */
.table-responsive {
  margin-bottom: 40px; /* Margine inferiore aumentato */
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

/* Stile del Modal */
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

/* Pulsanti del Modal */
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
  background-color: #85c1e9; /* Effetto hover per il pulsante del modal */
}

/* Stili degli Input Carini */
.cute-input {
  width: 100%;
  max-width: 100%; /* Garantisce che gli input non superino il loro contenitore */
  padding: 12px 16px; /* Padding aumentato */
  border: 1px solid #ccc;
  border-radius: 12px; /* Angoli arrotondati */
  font-size: 16px; /* Dimensione del carattere aumentata */
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  background-color: #fafafa; /* Sfondo chiaro per una migliore estetica */
}

.cute-input:focus {
  border-color: #8e44ad;
  box-shadow: 0 0 8px rgba(163, 212, 247, 0.5); /* Ombra sottile al focus */
  outline: none;
}

/* Pulsanti dei Filtri */
.filter-buttons {
  display: flex;
  gap: 30px; /* Spazio aumentato tra i pulsanti */
  margin-top: 20px; /* Margine superiore aggiunto */
}

.filter-button {
  background-color: #8e44ad;
  color: #ffffff;
  padding: 12px 24px; /* Padding aumentato */
  border: none;
  border-radius: 12px; /* Angoli arrotondati */
  font-size: 16px; /* Dimensione del carattere aumentata */
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.filter-button:hover {
  background-color: #85c1e9; /* Effetto hover per i pulsanti dei filtri */
}

/* Nascondi la tabella desktop su mobile */
.desktop-only {
  display: none;
}

/* Regolazioni Responsive */

/* Tablet e schermi più grandi */
@media (min-width: 768px) {
  .header-section {
    flex-direction: row;
    justify-content: space-between;
    gap: 40px; /* Spaziatura aumentata per schermi più grandi */
  }

  .filters-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 30px; /* Spaziatura consistente */
  }

  .modal-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
  }

  .user-cards-mobile {
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
  }
}

/* Schermi Desktop */
@media (min-width: 1024px) {
  .user-cards-mobile {
    display: none;
  }

  .desktop-only {
    display: block;
  }

  .modal-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;
  }
}

/* Altre regolazioni responsive */
@media (max-width: 480px) {
  .userlist-card {
    padding: 20px; /* Padding ridotto per schermi più piccoli */
  }

  .filter-buttons {
    flex-direction: column;
    width: 100%;
    gap: 20px; /* Spaziatura aumentata per una migliore distribuzione */
  }

  .filter-button {
    width: 100%;
    padding: 12px 24px; /* Padding aumentato */
  }

  .modal-content {
    padding: 20px;
    margin: 20px;
    width: auto;
  }

  .input-group input {
    padding: 12px 16px; /* Padding aumentato per i campi di input */
  }
}
</style>
