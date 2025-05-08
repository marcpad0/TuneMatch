<template>
  <div class="userlist-container">
    <!-- Profile Completion Modal -->
    <div v-if="showProfileCompletion" class="modal profile-completion-modal">
      <div class="modal-content">
        <h3 class="modal-title">Completa il tuo profilo</h3>
        <p>Per continuare, completa i seguenti dati obbligatori:</p>
        <form @submit.prevent="completeProfile">
          <div class="modal-grid">
            <div class="input-group">
              <label for="completePosition">Posizione:</label>
              <input
                id="completePosition"
                v-model="profileData.Position"
                required
                class="cute-input"
                placeholder="es. Milano"
              />
            </div>
            <div class="input-group">
              <label for="completeDateBorn">Data di Nascita:</label>
              <input
                id="completeDateBorn"
                type="date"
                v-model="profileData.DateBorn"
                required
                class="cute-input"
              />
            </div>
          </div>
          <button type="submit" class="modal-button">Salva e Continua</button>
        </form>
      </div>
    </div>

    <!-- Favorite Selection Modal -->
    <div v-if="showFavoriteSelectionModal" class="modal favorite-selection-modal">
      <div class="modal-content">
        <h2 class="modal-title">Select Your Music Preferences</h2>
        <p class="modal-subtitle">Search for your favorite tracks (max 3 selections).</p>
        
        <div class="deezer-search-container">
          <input
            type="text"
            v-model="deezerSearchQuery"
            placeholder="Search tracks on Deezer..."
            @keyup.enter="searchDeezer"
            class="cute-input"
          />
          <button @click="searchDeezer" :disabled="isLoadingDeezer" class="search-button">
            {{ isLoadingDeezer ? 'Searching...' : 'Search' }}
          </button>
        </div>

        <div v-if="deezerSearchError" class="error-message">{{ deezerSearchError }}</div>

        <div class="deezer-results-container" v-if="deezerSearchResults.length > 0">
          <p>Search Results:</p>
          <div class="results-grid">
            <div
              v-for="item in deezerSearchResults"
              :key="item.id"
              class="result-item"
              :class="{ 'selected': isSelectedFavorite(item) }"
              @click="toggleFavoriteSelection(item)"
            >
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" class="result-image"/>
              <div v-else class="result-image-placeholder">No Image</div>
              <div class="result-info">
                <span class="result-name">{{ item.name }}</span>
                <span class="result-artist">{{ item.artist }}</span>
              </div>
              <span v-if="isSelectedFavorite(item)" class="selected-indicator">✓</span>
            </div>
          </div>
        </div>
        <div v-else-if="!isLoadingDeezer && hasSearchedDeezer" class="no-results">
            No results found. Try a different search.
        </div>

        <div class="selected-favorites-container" v-if="selectedFavorites.length > 0">
          <p>Your Selections ({{ selectedFavorites.length }}/3):</p>
          <div class="selected-items-grid">
            <div v-for="item in selectedFavorites" :key="item.id" class="selected-item">
              <span>{{ item.name }} - {{ item.artist }}</span>
              <button @click="removeSelectedFavorite(item)" class="remove-button">&times;</button>
            </div>
          </div>
        </div>
        
        <div v-if="favoriteSelectionError" class="error-message">{{ favoriteSelectionError }}</div>
        <button @click="saveSelectedFavorites" class="modal-button save-favorites-button" :disabled="selectedFavorites.length === 0 && !hasPreviouslySavedFavorites">
          Save Preferences
        </button>
      </div>
    </div>

    <div v-if="!showProfileCompletion && !showFavoriteSelectionModal" class="userlist-card">
      <div class="header-section">
        <h2 class="title">Lista Utenti</h2>
        <div class="search-container">
          <input
            type="text"
            v-model="searchTerm"
            placeholder="Cerca utenti..."
            class="cute-input search-input"
          />
        </div>
      </div>

      <div class="filters">
        <h3 class="subtitle">Filtra Utenti</h3>
        <form @submit.prevent="applicaFiltri">
          <div class="filters-grid">
            <div class="input-group">
              <label for="filterUsername">Username:</label>
              <input
                id="filterUsername"
                v-model="filtri.Username"
                placeholder="es. mario.rossi"
                class="cute-input"
              />
            </div>
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
          v-for="utente in processedUtenti"
          :key="utente.id"
          class="user-card"
        >
          <div class="user-card-header">
            <router-link :to="{ name: 'profile', params: { userId: utente.id }}" class="user-profile-link">
              <strong>{{ utente.Username }}</strong>
            </router-link>
            <span v-if="utente.isAdmin" class="admin-badge">Admin</span>
          </div>
          <div class="user-card-content">
            <p><strong>Posizione:</strong> {{ utente.Position }}</p>
            <p><strong>Data di Nascita:</strong> {{ utente.DateBorn }}</p>
            <p v-if="utente.isAdmin"><strong>Ruolo:</strong> Amministratore</p>
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

      <div v-if="isSpotifyUser && spotifyFavorites.length > 0" class="spotify-notice">
  <div class="spotify-notice-content">
    <i class="fab fa-spotify spotify-icon"></i>
    <div>
      <h4>Spotify Integration Active</h4>
      <p>Your favorite tracks are automatically synchronized from Spotify.</p>
      <p v-if="spotifyFavoritesLastUpdated" class="update-time">
        Last updated: {{ new Date(spotifyFavoritesLastUpdated).toLocaleString() }}
      </p>
    </div>
  </div>
</div>

      <!-- Desktop Table -->
      <div class="table-responsive desktop-only">
        <table class="user-table">
          <thead>
            <tr>
              <th @click="sortBy('Username')" class="sortable-header">
                Username <span v-if="sortKey === 'Username'">{{ sortAsc ? '▲' : '▼' }}</span>
              </th>
              <th @click="sortBy('Position')" class="sortable-header">
                Posizione <span v-if="sortKey === 'Position'">{{ sortAsc ? '▲' : '▼' }}</span>
              </th>
              <th @click="sortBy('DateBorn')" class="sortable-header">
                Data di Nascita <span v-if="sortKey === 'DateBorn'">{{ sortAsc ? '▲' : '▼' }}</span>
              </th>
              <th>Status</th>
              <th>Listening</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="utente in processedUtenti" :key="utente.id">
              <td>
                <router-link :to="{ name: 'profile', params: { userId: utente.id }}" class="user-profile-link">
                  {{ utente.Username }}
                </router-link>
                <span v-if="utente.isAdmin" class="admin-badge">Admin</span>
              </td>
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
      userData: null, 
      mostraModaleModifica: false,
      utenteModificabile: {},
      filtri: {
        Username: "",
        Position: "",
        DateBorn: "",
      },
      favorites: [], 
      userId: null, 
      statuses: [],
      showProfileCompletion: false,
      profileData: {
        Position: "",
        DateBorn: "",
        Password: ""
      },
      currentUserDetails: null, 
      searchTerm: "",
      sortKey: "",
      sortAsc: true,
      
      // Data for Deezer integration
      showFavoriteSelectionModal: false,
      deezerSearchQuery: "",
      deezerSearchResults: [],
      selectedFavorites: [], // Stores selected Deezer item objects
      isLoadingDeezer: false,
      deezerSearchError: "",
      favoriteSelectionError: "",
      hasSearchedDeezer: false,
      hasPreviouslySavedFavorites: false, // To allow saving empty if they had favs before
      
      // New properties for Spotify integration
      isSpotifyUser: false,
      spotifyFavorites: [],
      isLoadingSpotifyFavorites: false,
      spotifyFavoritesError: "",
      spotifyFavoritesLastUpdated: null,
    };
  },
  computed: {
    processedUtenti() {
      let tempUtenti = [...this.utenti];

      if (this.filtri.Username) {
        tempUtenti = tempUtenti.filter(user =>
          user.Username && user.Username.toLowerCase().includes(this.filtri.Username.toLowerCase())
        );
      }

      if (this.searchTerm) {
        const searchTermLower = this.searchTerm.toLowerCase();
        tempUtenti = tempUtenti.filter(user =>
          (user.Username && user.Username.toLowerCase().includes(searchTermLower)) ||
          (user.emailSpotify && user.emailSpotify.toLowerCase().includes(searchTermLower)) ||
          (user.emailGoogle && user.emailGoogle.toLowerCase().includes(searchTermLower)) ||
          (user.Position && user.Position.toLowerCase().includes(searchTermLower))
        );
      }

      if (this.sortKey) {
        tempUtenti.sort((a, b) => {
          let valA = a[this.sortKey];
          let valB = b[this.sortKey];

          if (valA === undefined || valA === null) valA = '';
          if (valB === undefined || valB === null) valB = '';
          
          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();

          if (valA < valB) return this.sortAsc ? -1 : 1;
          if (valA > valB) return this.sortAsc ? 1 : -1;
          return 0;
        });
      }
      return tempUtenti;
    }
  },
  methods: {
    async getUserData() {
      try {
        const sessionResponse = await axios.get("http://localhost:3000/auth/me", {
          withCredentials: true,
        });

        if (sessionResponse.data && sessionResponse.data.userId) {
          this.userData = sessionResponse.data;
          this.userId = sessionResponse.data.userId;
          
          // Check if user is logged in via Spotify
          this.isSpotifyUser = sessionResponse.data.emailSpotify && sessionResponse.data.emailSpotify.length > 0;
          
          await this.fetchCurrentUserDetails(this.userId); 
          
          // For Spotify users, fetch their favorites first
          if (this.isSpotifyUser) {
            await this.fetchAndSaveSpotifyFavorites();
          }
          
          await this.checkRequiredFields(); // This will call checkRequiredSelections internally

          if (!this.showProfileCompletion && !this.showFavoriteSelectionModal) {
            await this.recuperaUtenti();
            this.setupWebSocket();
            
            // Set up periodic check for Spotify favorites
            if (this.isSpotifyUser) {
              this.setupSpotifyFavoritesPeriodic();
            }
          }
        } else {
          this.$router.push("/");
        }
      } catch (error) {
        console.error("Error in getUserData:", error);
      }
    },
    
    // New method to fetch and save Spotify favorites
    async fetchAndSaveSpotifyFavorites() {
      if (!this.isSpotifyUser) return;
      
      this.isLoadingSpotifyFavorites = true;
      this.spotifyFavoritesError = "";
      
      try {
        // Fetch user's favorites from the backend endpoint (which calls Spotify API)
        const response = await axios.get("http://localhost:3000/favorites", {
          withCredentials: true
        });
        
        if (response.data && Array.isArray(response.data)) {
          // Take top 3 tracks from Spotify
          const topTracks = response.data
          
          // Format to match our expected structure 
          const formattedTracks = topTracks.map(track => ({
            id: track.id,
            name: track.name,
            artist: track.artists.map(a => a.name).join(", "),
            albumName: track.album.name,
            imageUrl: track.album.images && track.album.images[0] ? track.album.images[0].url : null,
            link: track.external_urls?.spotify || "",
            type: 'track'
          }));
          
          // Save formatted tracks to instance data
          this.spotifyFavorites = formattedTracks;
          
          // Use these as the selected favorites
          this.selectedFavorites = [...formattedTracks];
          this.hasPreviouslySavedFavorites = true;
          
          // Save to database via API
          await this.saveSpotifyFavoritesToDatabase(formattedTracks);
          
          this.spotifyFavoritesLastUpdated = new Date();
          console.log("Spotify favorites updated:", this.spotifyFavorites);
        }
      } catch (error) {
        console.error("Error fetching Spotify favorites:", error);
        this.spotifyFavoritesError = "Failed to fetch your Spotify favorites. You may need to select favorites manually.";
      } finally {
        this.isLoadingSpotifyFavorites = false;
      }
    },
    
    // Save Spotify favorites to database
    async saveSpotifyFavoritesToDatabase(tracks) {
      try {
        await axios.post(`http://localhost:3000/users/${this.userId}/set-favorites`, 
          { favorites: tracks }, 
          { withCredentials: true }
        );
        console.log("Spotify favorites saved to database");
      } catch (error) {
        console.error("Error saving Spotify favorites to database:", error);
        throw error; // Re-throw to handle in calling method
      }
    },
    
    // Set up periodic check for Spotify favorites
    setupSpotifyFavoritesPeriodic() {
      // Check every 15 minutes
      this.spotifyCheckInterval = setInterval(() => {
        this.fetchAndSaveSpotifyFavorites();
      }, 15 * 60 * 1000);
    },
    
    async checkRequiredSelections() {
      if (!this.currentUserDetails) {
        // Attempt to fetch if not available, though it should be by now
        if (this.userId) await this.fetchCurrentUserDetails(this.userId);
        if (!this.currentUserDetails) return; 
      }

      // For Spotify users who already have favorites fetched, don't show selection modal
      if (this.isSpotifyUser && this.spotifyFavorites.length > 0) {
        this.showFavoriteSelectionModal = false;
        return;
      }

      const loggedInViaSpotify = this.currentUserDetails.emailSpotify && this.currentUserDetails.emailSpotify.length > 0;
      const favoritesAlreadySet = this.currentUserDetails.favorite_selections && 
                                 Array.isArray(this.currentUserDetails.favorite_selections) && 
                                 this.currentUserDetails.favorite_selections.length > 0;

      if (!loggedInViaSpotify && !favoritesAlreadySet) {
        this.showFavoriteSelectionModal = true;
        this.deezerSearchQuery = "";
        this.deezerSearchResults = [];
        this.deezerSearchError = "";
        this.favoriteSelectionError = "";
        this.hasSearchedDeezer = false;
      } else {
        this.showFavoriteSelectionModal = false;
      }
    },
    
    // Cleanup on component destruction
    clearPeriodicChecks() {
      if (this.spotifyCheckInterval) {
        clearInterval(this.spotifyCheckInterval);
      }
    },

    // Modified saveSelectedFavorites to handle both manual and Spotify cases
    async saveSelectedFavorites() {
      this.favoriteSelectionError = "";
      
      try {
        await axios.post(`http://localhost:3000/users/${this.userId}/set-favorites`, 
          { favorites: this.selectedFavorites }, 
          { withCredentials: true }
        );
        this.closeFavoriteSelectionModal();
        await this.fetchCurrentUserDetails(this.userId); 
        
        if(!this.showProfileCompletion && !this.showFavoriteSelectionModal) {
            await this.recuperaUtenti();
        }

      } catch (error) {
        console.error("Error saving favorites:", error);
        this.favoriteSelectionError = error.response?.data?.message || "Failed to save preferences.";
      }
    },
    
    async fetchCurrentUserDetails(userId) {
      try {
        const response = await axios.get(`http://localhost:3000/users/${userId}`, {
          withCredentials: true,
        });
        this.currentUserDetails = response.data;
        if (this.currentUserDetails && Array.isArray(this.currentUserDetails.favorite_selections)) {
          this.selectedFavorites = [...this.currentUserDetails.favorite_selections];
          this.hasPreviouslySavedFavorites = this.selectedFavorites.length > 0;
        } else {
          this.selectedFavorites = [];
          this.hasPreviouslySavedFavorites = false;
        }
      } catch (error) {
        console.error("Error fetching current user details:", error);
        this.currentUserDetails = null;
        this.selectedFavorites = [];
        this.hasPreviouslySavedFavorites = false;
      }
    },
    async checkRequiredFields() {
      try {
        // No need to fetch user again if already fetched in getUserData -> fetchCurrentUserDetails
        if (!this.currentUserDetails && this.userId) {
             await this.fetchCurrentUserDetails(this.userId);
        }

        if (this.currentUserDetails) {
          if (!this.currentUserDetails.Position || !this.currentUserDetails.DateBorn) {
            this.profileData.Position = this.currentUserDetails.Position || "";
            this.profileData.DateBorn = this.currentUserDetails.DateBorn || "";
            this.showProfileCompletion = true;
          } else {
            this.showProfileCompletion = false;
            await this.checkRequiredSelections(); 
            if (!this.showFavoriteSelectionModal && !this.showProfileCompletion) {
                await this.recuperaUtenti();
                this.setupWebSocket();
            }
          }
        }
      } catch (error) {
        console.error("Errore nel controllo dei campi obbligatori:", error);
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

        this.utenti = response.filter((user) => !user.isAdmin);
        this.utenti = this.utenti.filter((user) => !user.emailTwitch);
        
        console.log("Users loaded:", this.utenti.length);
      } catch (error) {
        console.error("Errore nel recupero degli utenti:", error);
        alert("Impossibile recuperare gli utenti.");
      }
    },
    openFavoriteSelectionModal() {
      if (this.currentUserDetails && this.currentUserDetails.favorite_selections && Array.isArray(this.currentUserDetails.favorite_selections)) {
        const favs = [...this.currentUserDetails.favorite_selections];
        while (favs.length < 3) {
          favs.push("");
        }
        this.currentFavorites = favs.slice(0, 3);
      } else {
        this.currentFavorites = ["", "", ""];
      }
      this.favoriteSelectionError = "";
      this.showFavoriteSelectionModal = true;
    },
    closeFavoriteSelectionModal() {
      this.showFavoriteSelectionModal = false;
      this.deezerSearchError = "";
      this.favoriteSelectionError = "";
    },
    async searchDeezer() {
      if (!this.deezerSearchQuery.trim()) {
        this.deezerSearchError = "Please enter a search term.";
        return;
      }
      this.isLoadingDeezer = true;
      this.deezerSearchError = "";
      this.deezerSearchResults = [];
      this.hasSearchedDeezer = true;

      try {
        const response = await axios.get("http://localhost:3000/api/deezer/search", {
          params: { query: this.deezerSearchQuery, limit: 10 }, // 'limit' matches backend
          withCredentials: true,
        });
        this.deezerSearchResults = response.data;
      } catch (error) {
        console.error("Error searching Deezer:", error);
        this.deezerSearchError = error.response?.data?.message || "Failed to fetch music results from Deezer.";
      } finally {
        this.isLoadingDeezer = false;
      }
    },
    isSelectedFavorite(item) {
      return this.selectedFavorites.some(fav => fav.id === item.id);
    },

    toggleFavoriteSelection(item) {
      this.favoriteSelectionError = ""; 
      const index = this.selectedFavorites.findIndex(fav => fav.id === item.id);
      if (index > -1) {
        this.selectedFavorites.splice(index, 1);
      } else {
        if (this.selectedFavorites.length < 3) {
          this.selectedFavorites.push(item);
        } else {
          this.favoriteSelectionError = "You can select a maximum of 3 favorites.";
        }
      }
    },
    removeSelectedFavorite(itemToRemove) {
        this.selectedFavorites = this.selectedFavorites.filter(item => item.id !== itemToRemove.id);
    },
    async completeProfile() {
      try {
        this.profileData.Password = this.currentUserDetails.Password || "";
        
        await axios.put(
          `http://localhost:3000/users/${this.userId}`,
          {
            ...this.currentUserDetails,
            Position: this.profileData.Position,
            DateBorn: this.profileData.DateBorn,
            Password: this.profileData.Password,
          },
          {
            headers: {
              userId: this.userId,
            },
            withCredentials: true,
          }
        );
        
        this.showProfileCompletion = false;
        
        await this.fetchCurrentUserDetails(this.userId); 
        await this.checkRequiredSelections(); 
        
        if (!this.showFavoriteSelectionModal && !this.showProfileCompletion) { 
            await this.recuperaUtenti();
            this.setupWebSocket();
        }
        
      } catch (error) {
        console.error("Errore nell'aggiornamento del profilo:", error);
        alert("Impossibile aggiornare il profilo. Riprova più tardi.");
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
          this.utenti = JSON.parse(xhr.responseText).filter(
            (user) => !user.isAdmin && !user.emailTwitch
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
      this.filtri.Username = "";
      this.searchTerm = "";
      this.sortKey = "";
      this.recuperaUtenti();
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
    sortBy(key) {
      if (this.sortKey === key) {
        this.sortAsc = !this.sortAsc;
      } else {
        this.sortKey = key;
        this.sortAsc = true;
      }
    }
  },
  mounted() {
    this.getUserData();
  },
  beforeUnmount() {
    // Clean up periodic checks
    this.clearPeriodicChecks();
  }
};
</script>

<style scoped>
*,
*::before,
*::after {
  box-sizing: border-box;
}

.userlist-container {
  padding: 20px;
}

.deezer-search-container { /* Renamed from musixmatch */
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  align-items: center;
}

.deezer-search-container .cute-input {
  flex-grow: 1;
}

.search-button {
  padding: 10px 15px;
  background-color: #5cb85c; 
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
}
.search-button:hover {
  background-color: #4cae4c;
}
.search-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* Spotify Notice */
.spotify-notice {
  background-color: rgba(30, 215, 96, 0.15);
  border: 1px solid rgba(30, 215, 96, 0.3);
  border-radius: 12px;
  padding: 15px;
  margin: 20px 0;
}

.spotify-notice-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.spotify-notice h4 {
  margin: 0 0 5px 0;
  color: #1db954;
}

.spotify-notice p {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.update-time {
  font-size: 12px;
  color: #666;
  margin-top: 5px !important;
}

.spotify-icon {
  color: #1db954;
  font-size: 2rem;
}

.deezer-results-container { /* Renamed */
  margin-top: 15px;
  max-height: 250px; 
  overflow-y: auto;
  border: 1px solid #eee;
  padding: 10px;
  border-radius: 8px;
}
.no-results {
    text-align: center;
    color: #777;
    margin-top: 20px;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr; 
  gap: 10px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.result-item:hover {
  background-color: #f9f9f9;
}
.result-item.selected {
  background-color: #e6f7ff; 
  border-color: #91d5ff;
}

.result-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 10px;
  background-color: #eee; 
}
.result-image-placeholder {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  color: #aaa;
  font-size: 10px;
  text-align: center;
  border-radius: 4px;
  margin-right: 10px;
}

.result-info {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
.result-name {
  font-weight: bold;
  font-size: 0.95em;
}
.result-artist {
  font-size: 0.85em;
  color: #555;
}
.selected-indicator {
    margin-left: auto;
    color: green;
    font-weight: bold;
    font-size: 1.2em;
}

.selected-favorites-container {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}
.selected-favorites-container p {
    font-weight: bold;
    margin-bottom: 10px;
}

.selected-items-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.selected-item {
  background-color: #e9ecef;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 8px;
}
.remove-button {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-weight: bold;
  padding: 0 5px;
}

.save-favorites-button {
  margin-top: 20px; 
}
.error-message {
  margin-top: 10px;
  margin-bottom: 10px;
}
.favorite-selection-modal .modal-content {
  min-height: 400px; 
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
  gap: 20px;
  margin-bottom: 40px;
}

.search-container {
  width: 100%;
  max-width: 400px;
}

.search-input {
  width: 100%;
}

.profile-completion-modal .modal-content {
  max-width: 500px;
}

.profile-completion-modal p {
  margin-bottom: 20px;
}

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
  gap: 20px;
  margin-bottom: 20px;
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
}

.user-cards-mobile {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
  margin-bottom: 40px;
}

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

.user-card-header strong {
  margin-right: 8px;
}

.admin-badge {
  background-color: #8e44ad;
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  margin-left: 8px;
  vertical-align: middle;
}

.user-card-content {
  display: grid;
  gap: 15px;
}

.user-card-content p {
  margin: 0;
  font-size: 16px;
}

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
}

.status-indicator.offline {
  background-color: #e74c3c;
}

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

.user-table th.sortable-header {
  cursor: pointer;
}

.user-table th.sortable-header:hover {
  background-color: #e9e9e9;
}

.user-table td {
  font-size: 15px;
}

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

.desktop-only {
  display: none;
}

.user-profile-link {
  color: inherit;
  text-decoration: none;
  position: relative;
}

.user-profile-link:hover {
  color: #42b983;
}

.user-profile-link:after {
  content: '';
  position: absolute;
  width: 100%;
  height: 2px;
  bottom: -2px;
  left: 0;
  background-color: #42b983;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.user-profile-link:hover:after {
  transform: scaleX(1);
}

.favorite-selection-modal .modal-content {
  max-width: 550px;
  padding: 25px 30px;
}

.favorite-selection-modal .modal-title {
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  text-align: center;
}

.favorite-selection-modal .modal-subtitle {
  font-size: 14px;
  color: #666;
  margin-bottom: 25px;
  text-align: center;
}

.favorite-inputs {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.favorite-inputs .input-group {
  margin-bottom: 0;
}

.favorite-inputs .cute-input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
}

.favorite-inputs .cute-input:focus {
  border-color: #8e44ad;
  box-shadow: 0 0 0 2px rgba(142, 68, 173, 0.2);
}

.save-favorites-button {
  width: 100%;
  padding: 12px 20px;
  font-size: 16px;
  margin-top: 10px;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  margin-bottom: 15px;
  text-align: center;
}

.close {
  position: absolute;
  top: 15px;
  right: 20px;
  font-size: 24px;
  font-weight: bold;
  color: #888;
  cursor: pointer;
}
.close:hover {
  color: #333;
}

.modal {
  z-index: 1050;
}

@media (min-width: 768px) {
  .header-section {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
  }

  .search-container {
    flex-grow: 1;
    margin: 0 20px;
  }

  .filters-grid {
    grid-template-columns: repeat(3, 1fr);
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
    grid-template-columns: repeat(2, 1fr);
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