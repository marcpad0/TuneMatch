<!-- src/components/UserList.vue -->
<template>
  <div class="userlist-container">
    <div class="userlist-card">
      <!-- Header Section with Responsive Layout -->
      <div class="header-section">
        <h2 class="title">Lista Utenti</h2>
        <button class="filter-button" @click="logout">Logout</button>
      </div>

      <!-- Sezione di Filtro -->
      <div class="filters">
        <h3 class="subtitle">Filtra Utenti</h3>
        <form @submit.prevent="applyFilters">
          <div class="filters-grid">
            <div class="input-group">
              <label for="position">Posizione:</label>
              <input
                id="position"
                v-model="filters.Position"
                placeholder="es. Bergamo"
                class="cute-input"
              />
            </div>
            <div class="input-group">
              <label for="dateBorn">Data di Nascita:</label>
              <input
                type="date"
                id="dateBorn"
                v-model="filters.DateBorn"
                class="cute-input"
              />
            </div>
          </div>
          <div class="filter-buttons">
            <button type="submit" class="filter-button">Applica Filtri</button>
            <button type="button" class="filter-button" @click="resetFilters">
              Reset Filtri
            </button>
          </div>
        </form>
      </div>

      <!-- Mobile User Cards -->
      <div class="user-cards-mobile">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="user-card"
        >
          <div class="user-card-header">
            <strong>{{ user.Username }}</strong>
            <div class="user-actions">
              <button
                v-if="canEdit(user)"
                class="action-button"
                @click="editUser(user)"
              >
                Modifica
              </button>
              <button
                v-if="canDelete(user)"
                class="action-button delete-button"
                @click="deleteUser(user.id)"
              >
                Cancella
              </button>
            </div>
          </div>
          <div class="user-card-content">
            <p v-if="isAdmin"><strong>ID:</strong> {{ user.id }}</p>
            <p><strong>Email:</strong> {{ user.emailSpotify }}</p>
            <p><strong>Posizione:</strong> {{ user.Position }}</p>
            <p><strong>Data di Nascita:</strong> {{ user.DateBorn }}</p>
          </div>
        </div>
      </div>

      <!-- Desktop Table -->
      <div class="table-responsive desktop-only">
        <table class="user-table">
          <thead>
            <tr>
              <th v-if="isAdmin">ID</th>
              <th>Username</th>
              <th>Email Spotify</th>
              <th>Posizione</th>
              <th>Data di Nascita</th>
              <th v-if="isAdmin">isAdmin</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td v-if="isAdmin">{{ user.id }}</td>
              <td>{{ user.Username }}</td>
              <td>{{ user.emailSpotify }}</td>
              <td>{{ user.Position }}</td>
              <td>{{ user.DateBorn }}</td>
              <td v-if="isAdmin">{{ user.isAdmin ? "Yes" : "No" }}</td>
              <td>
                <button
                  v-if="canEdit(user)"
                  class="action-button"
                  @click="editUser(user)"
                >
                  Modifica
                </button>
                <button
                  v-if="canDelete(user)"
                  class="action-button delete-button"
                  @click="deleteUser(user.id)"
                >
                  Cancella
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal di Modifica Utente -->
      <div v-if="showEditModal" class="modal">
        <div class="modal-content">
          <span class="close" @click="closeModal">&times;</span>
          <h3 class="modal-title">Modifica Utente</h3>
          <form @submit.prevent="updateUser">
            <div class="modal-grid">
              <div class="input-group">
                <label for="editUsername">Username:</label>
                <input
                  id="editUsername"
                  v-model="editableUser.Username"
                  required
                  class="cute-input"
                />
              </div>
              <div class="input-group">
                <label for="editEmailSpotify">Email Spotify:</label>
                <input
                  id="editEmailSpotify"
                  v-model="editableUser.emailSpotify"
                  class="cute-input"
                />
              </div>
              <div class="input-group">
                <label for="editPosition">Posizione:</label>
                <input
                  id="editPosition"
                  v-model="editableUser.Position"
                  class="cute-input"
                />
              </div>
              <div class="input-group">
                <label for="editPassword">Password:</label>
                <input
                  id="editPassword"
                  type="password"
                  v-model="editableUser.Password"
                  required
                  class="cute-input"
                />
              </div>
              <div class="input-group">
                <label for="editDateBorn">Data di Nascita:</label>
                <input
                  id="editDateBorn"
                  type="date"
                  v-model="editableUser.DateBorn"
                  class="cute-input"
                />
              </div>
              <div v-if="isAdmin" class="input-group checkbox-group">
              <label for="editIsAdmin">
                <input
                  id="editIsAdmin"
                  type="checkbox"
                  v-model="editableUser.isAdmin"
                  :disabled="!isAdmin"
                />
                Is Admin
              </label>
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
      users: [],
      filteredUsers: [],
      isAdmin: false,
      userId: null,
      showEditModal: false,
      editableUser: {},
      filters: {
        Position: "",
        DateBorn: "",
      },
    };
  },
  methods: {
    // Verifica se l'utente può modificare
    canEdit(user) {
      return this.isAdmin || user.id === parseInt(this.userId);
    },
    // Verifica se l'utente può cancellare
    canDelete(user) {
      return this.isAdmin || user.id === parseInt(this.userId);
    },
    // Fetch degli utenti
    async fetchUsers() {
      try {
        this.isAdmin = localStorage.getItem("isAdmin") === "true";
        this.userId = localStorage.getItem("userId");

        // Fetch all users
        const response = await axios.get("http://37.27.206.153:3000/users", {
          headers: {
            isAdmin: this.isAdmin.toString(),
            userId: this.userId,
          },
        });

        this.users = response.data;
        this.filteredUsers = this.users; // Inizializza filteredUsers
      } catch (error) {
        console.error("Errore nel fetching degli utenti:", error);
        alert("Impossibile recuperare gli utenti.");
      }
    },
    // Edita un utente
    editUser(user) {
      if (this.canEdit(user)) {
        // Clona l'oggetto utente per evitare di mutare i dati originali
        this.editableUser = { ...user };
        this.showEditModal = true;
      } else {
        alert("Non hai i permessi per modificare questo utente.");
      }
    },
    // Chiudi il modal
    closeModal() {
      this.showEditModal = false;
      this.editableUser = {};
    },
    // Aggiorna un utente
    async updateUser() {
      try {
        await axios.put(
          `http://37.27.206.153:3000/users/${this.editableUser.id}`,
          {
            Username: this.editableUser.Username,
            Surname: this.editableUser.Surname,
            emailSpotify: this.editableUser.emailSpotify,
            Position: this.editableUser.Position,
            Password: this.editableUser.Password,
            DateBorn: this.editableUser.DateBorn,
          },
          {
            headers: {
              isAdmin: this.isAdmin.toString(),
              userId: this.userId,
            },
          }
        );

        alert("Utente aggiornato con successo.");
        this.closeModal();
        this.fetchUsers(); // Aggiorna la lista degli utenti
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
    async deleteUser(id) {
      if (
        !confirm(`Sei sicuro di voler eliminare l'utente con ID "${id}"?`)
      ) {
        return;
      }

      try {
        await axios.delete(`http://37.27.206.153:3000/users/${id}`, {
          headers: {
            isAdmin: this.isAdmin.toString(),
            userId: this.userId,
          },
        });

        // Verifica se l'utente eliminato è se stesso
        if (id === parseInt(this.userId)) {
          alert("Il tuo account è stato eliminato. Effettua il login di nuovo.");
          this.logout(); // Esegui il logout e reindirizza alla pagina di login
        } else {
          alert(`Utente con ID "${id}" eliminato con successo.`);
          this.fetchUsers(); // Aggiorna la lista degli utenti
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
    logout() {
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("userId");
      this.$router.push("/"); // Reindirizza alla pagina di login
    },
    // Applica i filtri
    applyFilters() {
      this.filteredUsers = this.users.filter((user) => {
        const matchesPosition = this.filters.Position
          ? user.Position.toLowerCase().includes(
              this.filters.Position.toLowerCase()
            )
          : true;
        const matchesDateBorn = this.filters.DateBorn
          ? user.DateBorn === this.filters.DateBorn
          : true;
        return matchesPosition && matchesDateBorn;
      });
    },
    // Resetta i filtri
    resetFilters() {
      this.filters.Position = "";
      this.filters.DateBorn = "";
      this.filteredUsers = this.users;
    },
  },
  mounted() {
    this.fetchUsers();
  },
};
</script>

<style scoped>
/* Apply box-sizing globally within this component */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Container Padding */
.userlist-container {
  padding: 20px;
}

/* Card Spacing */
.userlist-card {
  background-color: #ffffff;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  margin: 20px 0; /* Increased margin for more distance */
}

/* Header Section */
.header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px; /* Increased spacing between header elements */
  margin-bottom: 40px; /* Increased bottom margin */
}

.title {
  font-size: 24px;
  margin: 0;
}

/* Filters Section */
.filters {
  margin-bottom: 40px; /* Increased bottom margin */
}

.subtitle {
  font-size: 20px;
  margin-bottom: 20px;
}

/* Filters Grid */
.filters-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px; /* Increased spacing between filter inputs */
  margin-bottom: 20px;
}

/* Modal Grid */
.modal-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px; /* Increased spacing between modal inputs */
}

/* Mobile User Cards */
.user-cards-mobile {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px; /* Increased spacing between user cards */
  margin-bottom: 40px; /* Increased bottom margin */
}

/* User Card Styling */
.user-card {
  background-color: #fdfdfd; /* Slightly different background for contrast */
  border: 1px solid #e0e0e0;
  border-radius: 16px; /* Increased border-radius for a cuter look */
  padding: 25px; /* Increased padding for more spacious feel */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.05); /* Softer shadow */
  transition: transform 0.3s ease, box-shadow 0.3s ease; /* Enhanced hover effect */
}

.user-card:hover {
  transform: translateY(-6px); /* Slightly more lift on hover */
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1); /* Enhanced shadow on hover */
}

.user-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px; /* Increased margin */
  flex-wrap: wrap;
  gap: 20px; /* Increased spacing */
}

.user-card-content {
  display: grid;
  gap: 15px; /* Increased spacing between card content */
}

.user-card-content p {
  margin: 0;
  font-size: 16px; /* Increased font size for better readability */
}

/* User Actions */
.user-actions {
  display: flex;
  gap: 20px; /* Increased spacing between buttons */
}

/* Action Buttons */
.action-button {
  background-color: #ffda79;
  border: none;
  padding: 12px 20px; /* Increased padding */
  border-radius: 10px; /* Rounded corners */
  cursor: pointer;
  font-size: 16px; /* Increased font size */
  transition: background-color 0.3s ease;
}

.action-button:hover {
  background-color: #ffcc66; /* Slight hover color change */
}

.delete-button {
  background-color: #ff6b6b; /* Bright color for delete button */
  color: white;
}

.delete-button:hover {
  background-color: #ff4d4d; /* Slight hover color change */
}

/* Desktop Table */
.table-responsive {
  margin-bottom: 40px; /* Increased bottom margin */
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

/* Modal Styling */
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

/* Modal Buttons */
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
  background-color: #85c1e9; /* Hover effect for modal button */
}

/* Cute Input Styles */
.cute-input {
  width: 100%;
  max-width: 100%; /* Ensures inputs don't exceed their container */
  padding: 12px 16px; /* Increased padding */
  border: 1px solid #ccc;
  border-radius: 12px; /* Rounded corners */
  font-size: 16px; /* Increased font size */
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  background-color: #fafafa; /* Light background for better aesthetics */
}

.cute-input:focus {
  border-color: #8e44ad;
  box-shadow: 0 0 8px rgba(163, 212, 247, 0.5); /* Subtle shadow on focus */
  outline: none;
}

/* Checkbox Group */
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
}

/* Filter Buttons */
.filter-buttons {
  display: flex;
  gap: 30px; /* Increased space between buttons */
  margin-top: 20px; /* Added top margin */
}

.filter-button {
  background-color: #8e44ad;
  color: #ffffff;
  padding: 12px 24px; /* Increased padding */
  border: none;
  border-radius: 12px; /* Rounded corners */
  font-size: 16px; /* Increased font size */
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.filter-button:hover {
  background-color: #85c1e9; /* Hover effect for filter buttons */
}

/* Hide desktop table on mobile */
.desktop-only {
  display: none;
}

/* Responsive Adjustments */

/* Tablet and larger screens */
@media (min-width: 768px) {
  .header-section {
    flex-direction: row;
    justify-content: space-between;
    gap: 40px; /* Increased gap for larger screens */
  }

  .filters-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 30px; /* Consistent spacing */
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

/* Desktop screens */
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

/* Additional responsive adjustments */
@media (max-width: 480px) {
  .userlist-card {
    padding: 20px; /* Reduced padding for smaller screens */
  }

  .filter-buttons {
    flex-direction: column;
    width: 100%;
    gap: 20px; /* Increased gap for better spacing */
  }

  .filter-button {
    width: 100%;
    padding: 12px 24px; /* Increased padding */
  }

  .modal-content {
    padding: 20px;
    margin: 20px;
    width: auto;
  }

  .input-group input {
    padding: 12px 16px; /* Increased padding for input fields */
  }
}
</style>
