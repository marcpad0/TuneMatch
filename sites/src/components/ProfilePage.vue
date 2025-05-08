<template>
  <div class="profile-page">
    <!-- Back Navigation -->
    <div class="profile-navigation">
      <button class="back-button" @click="goBack">
        <span class="back-icon">←</span>
        <span>Torna indietro</span>
      </button>
    </div>

    <!-- Purple Header Background -->
    <div class="profile-background"></div>
    
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="pulse-loader"></div>
      <p>Loading profile...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">!</div>
      <h3>Something went wrong</h3>
      <p>{{ error }}</p>
      <button @click="fetchUserProfile" class="retry-button">Try Again</button>
    </div>

    <!-- Profile Content -->
    <div v-else class="profile-content">
      <!-- User Profile Card -->
      <div class="profile-card" v-if="userData">
        <div class="avatar-container">
          <div class="avatar">{{ getUserInitials() }}</div>
        </div>
        
        <!-- Settings Icon (Only for own profile) - Moved outside avatar container -->
        <div v-if="isOwnProfile" class="settings-container">
          <button class="gear-button" @click="toggleSettingsMenu">
            <span class="gear-icon">⚙️</span>
          </button>
          
          <div v-if="showSettingsMenu" class="settings-dropdown" ref="settingsMenu">
            <div class="dropdown-item" @click="openModifyModal">
              <span class="dropdown-icon">✏️</span>
              Modifica Profilo
            </div>
            <div class="dropdown-item delete-item" @click="openDeleteConfirmation">
              <span class="dropdown-icon">🗑️</span>
              Elimina Account
            </div>
          </div>
        </div>

        <div class="user-info">
          <h2 class="username">{{ userData.Username }}</h2>
          <div class="user-meta">
            <span class="meta-item">
              <span class="meta-icon">📍</span> {{ userData.Position || 'No Location' }}
            </span>
            <span class="meta-item">
              <span class="meta-icon">🎂</span> {{ formatDate(userData.DateBorn) || 'No Birthday' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Music Compatibility Section - Only show when viewing someone else's profile -->
      <div class="section-card compatibility-card" v-if="compatibility && !isOwnProfile">
        <h2 class="section-title">Music Compatibility</h2>
        
        <div class="compatibility-content">
          <div class="compatibility-score">
            <div class="score-circle" :style="getScoreStyle(compatibility.score)">
              {{ compatibility.score }}%
            </div>
            <p class="match-level">{{ compatibility.matchLevel }}</p>
          </div>
          
          <div class="interests-section">
            <h3 class="interests-title">Common Interests</h3>
            <div class="tags-container">
              <div v-for="(artist, index) in compatibility.commonArtists.slice(0, 3)" 
                   :key="'artist-'+index" 
                   class="interest-tag artist-tag">
                {{ artist }}
              </div>
              <div v-for="(genre, index) in compatibility.commonGenres.slice(0, 3)" 
                   :key="'genre-'+index" 
                   class="interest-tag genre-tag">
                {{ genre }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Music Tastes Section -->
      <div class="section-card">
        <h2 class="section-title">Music Tastes</h2>
        
        <div class="tabs">
          <button 
            v-for="tab in ['tracks', 'artists', 'genres']"
            :key="tab"
            class="tab-button" 
            :class="{ active: activeTab === tab }" 
            @click="activeTab = tab"
          >
            {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
          </button>
        </div>
        
        <!-- Tracks Tab Content -->
        <div v-if="activeTab === 'tracks'" class="tab-content">
          <div class="music-grid">
            <div v-for="(track, index) in favorites.tracks.slice(0, 6)" :key="index" 
                 class="music-card" @click="openMusicTrack(track)">
              <div class="music-cover">
                <img :src="track.imageUrl || 'https://via.placeholder.com/150'" :alt="track.name" />
              </div>
              <div class="music-info">
                <h3 class="music-title">{{ track.name }}</h3>
                <p class="music-artist">{{ track.artist }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Artists Tab Content -->
        <div v-if="activeTab === 'artists'" class="tab-content">
          <div class="music-grid">
            <div v-for="(artist, index) in favorites.artists.slice(0, 6)" :key="index" class="music-card">
              <div class="music-cover">
                <img :src="artist.picture || 'https://via.placeholder.com/150'" :alt="artist.name" />
              </div>
              <div class="music-info">
                <h3 class="music-title">{{ artist.name }}</h3>
              </div>
            </div>
          </div>
          <div v-if="favorites.artists.length === 0" class="empty-section">
            <p>No artist data available</p>
          </div>
        </div>
        
        <!-- Genres Tab Content -->
        <div v-if="activeTab === 'genres'" class="tab-content">
          <div class="genres-grid">
            <div v-for="(genre, index) in favorites.genres.slice(0, 10)" :key="index" class="genre-bubble"
                 :style="{ backgroundImage: genre.picture ? `url(${genre.picture})` : '' }">
              {{ genre.name }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modify Profile Modal - Fixed width and padding -->
    <div v-if="showModifyModal" class="modal-overlay" @click.self="closeModifyModal">
      <div class="modal">
        <div class="modal-header">
          <h3>Modifica Profilo</h3>
          <button @click="closeModifyModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="input-group">
            <label for="modifyUsername">Username:</label>
            <input id="modifyUsername" v-model="modifyData.Username" class="form-input" placeholder="Username"/>
          </div>
          
          <div class="input-group">
            <label for="modifyPosition">Posizione:</label>
            <input id="modifyPosition" v-model="modifyData.Position" class="form-input" placeholder="es. Milano"/>
          </div>
          
          <div class="input-group">
            <label for="modifyDateBorn">Data di Nascita:</label>
            <input id="modifyDateBorn" type="date" v-model="modifyData.DateBorn" class="form-input"/>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeModifyModal" class="cancel-btn">Annulla</button>
          <button @click="updateProfile" class="primary-btn">Salva Modifiche</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirmation" class="modal-overlay" @click.self="closeDeleteConfirmation">
      <div class="modal">
        <div class="modal-header delete-header">
          <h3>Elimina Account</h3>
          <button @click="closeDeleteConfirmation" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="warning-message">
            <p><strong>Attenzione!</strong> Questa azione non può essere annullata.</p>
            <p>Sei sicuro di voler eliminare definitivamente il tuo account?</p>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeDeleteConfirmation" class="cancel-btn">Annulla</button>
          <button @click="deleteAccount" class="delete-btn">Elimina Account</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "ProfilePage",
  props: {
    userId: {
      type: [String, Number],
      required: true,
    },
  },
  data() {
    return {
      userData: null,
      loading: true,
      error: null,
      favorites: {
        tracks: [],
        artists: [],
        genres: []
      },
      activeTab: "tracks",
      userStatus: {
        online: false,
        currentTrack: null,
      },
      compatibility: null,
      previousUsers: [],
      currentUserId: null,
      isOwnProfile: false,
      showSettingsMenu: false,
      showModifyModal: false,
      showDeleteConfirmation: false,
      modifyData: {
        Username: "",
        Position: "",
        DateBorn: "",
      }
    };
  },
  async mounted() {
    try {
      await this.getCurrentUser();
      await this.fetchUserData(this.userId);
      this.isOwnProfile = this.currentUserId && this.currentUserId.toString() === this.userId.toString();
      document.addEventListener('click', this.handleOutsideClick);
    } catch (error) {
      this.error = "Failed to load user profile";
      this.loading = false;
      console.error(error);
    }
    this.fetchUserProfile();
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick);
  },
  methods: {
    async getCurrentUser() {
      try {
        const response = await axios.get("http://localhost:3000/auth/me", {
          withCredentials: true
        });
        if (response.data && response.data.userId) {
          this.currentUserId = response.data.userId;
        }
      } catch (error) {
        console.log("Not logged in or error fetching current user");
      }
    },
    
    toggleSettingsMenu(event) {
      event.stopPropagation();
      this.showSettingsMenu = !this.showSettingsMenu;
    },
    
    handleOutsideClick(event) {
      const settingsMenu = this.$refs.settingsMenu;
      const gearButton = event.target.closest('.gear-button');
      
      if (this.showSettingsMenu && settingsMenu && !settingsMenu.contains(event.target) && !gearButton) {
        this.showSettingsMenu = false;
      }
    },
    
    openModifyModal() {
      this.showSettingsMenu = false;
      this.modifyData = {
        Username: this.userData.Username || "",
        Position: this.userData.Position || "",
        DateBorn: this.userData.DateBorn || ""
      };
      this.showModifyModal = true;
    },
    
    closeModifyModal() {
      this.showModifyModal = false;
    },
    
    openDeleteConfirmation() {
      this.showSettingsMenu = false;
      this.showDeleteConfirmation = true;
    },
    
    closeDeleteConfirmation() {
      this.showDeleteConfirmation = false;
    },
    
    async updateProfile() {
      try {
        await axios.put(
          `http://localhost:3000/users/${this.userId}`,
          {
            ...this.userData,
            Username: this.modifyData.Username,
            Position: this.modifyData.Position,
            DateBorn: this.modifyData.DateBorn
          },
          {
            headers: {
              userId: this.currentUserId
            },
            withCredentials: true
          }
        );
        
        await this.fetchUserData(this.userId);
        alert("Profilo aggiornato con successo");
        this.closeModifyModal();
      } catch (error) {
        console.error("Error updating profile:", error);
        alert("Errore durante l'aggiornamento del profilo. Riprova più tardi.");
      }
    },
    
    async deleteAccount() {
      try {
        await axios.delete(`http://localhost:3000/users/${this.userId}`, {
          headers: {
            userId: this.currentUserId
          },
          withCredentials: true
        });
        
        await axios.post("http://localhost:3000/logout", {}, {
          withCredentials: true
        });
        this.$router.push("/");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("Errore durante l'eliminazione dell'account. Riprova più tardi.");
      }
    },
    
    async fetchUserProfile() {
      this.loading = true;
      this.error = null;
      
      try {
        const userResponse = await axios.get(`http://localhost:3000/users/${this.userId}`, {
          withCredentials: true
        });
        
        this.userData = userResponse.data;
        
        const favoritesResponse = await axios.get(`http://localhost:3000/users/${this.userId}/favorites`, {
          withCredentials: true
        });

        this.favorites = favoritesResponse.data;
        
        try {
          const meResponse = await axios.get("http://localhost:3000/auth/me", {
            withCredentials: true
          });
          
          if (meResponse.data && meResponse.data.userId !== parseInt(this.userId)) {
            const compatibilityResponse = await axios.get(
              `http://localhost:3000/users/compatibility/${meResponse.data.userId}/${this.userId}`, 
              { withCredentials: true }
            );
            this.compatibility = compatibilityResponse.data;
          }
        } catch (error) {
          console.log("Not logged in or error fetching current user");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        this.error = "Failed to load profile. Please try again.";
      } finally {
        this.loading = false;
      }
    },
    
    async fetchUserData(userId) {
      this.loading = true;
      try {
        const response = await axios.get(`http://localhost:3000/users/${userId}`, {
          withCredentials: true
        });
        this.userData = response.data;
        this.loading = false;
      } catch (error) {
        this.error = "Failed to load user data";
        this.loading = false;
        throw error;
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return "Unknown";
      const options = { year: "numeric", month: "long", day: "numeric" };
      return new Date(dateString).toLocaleDateString(undefined, options);
    },
    
    openMusicTrack(track) {
      console.log("Opening track:", track);
    },
    
    openSpotifyTrack(track) {
      this.openMusicTrack(track);
    },
    
    getScoreStyle(score) {
      let color;
      if (score >= 80) color = '#4CAF50';
      else if (score >= 60) color = '#2196F3';
      else if (score >= 40) color = '#FF9800';
      else color = '#F44336';
      
      return {
        background: `conic-gradient(${color} ${score}%, #e0e0e0 0%)`,
        color: score >= 60 ? 'white' : '#333'
      };
    },

    goBack() {
      this.$router.back();
    },

    getUserInitials() {
      if (!this.userData || !this.userData.Username) return '?';
      return this.userData.Username.charAt(0).toUpperCase();
    }
  },
  watch: {
    userId: {
      immediate: true,
      handler(newId, oldId) {
        if (oldId && oldId !== newId) {
          this.previousUsers.push(oldId);
        }
        if (newId) {
          this.fetchUserData(newId);
          this.isOwnProfile = this.currentUserId && this.currentUserId.toString() === newId.toString();
        }
      }
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

/* Base Styles */
.profile-page {
  font-family: 'Poppins', sans-serif;
  max-width: 1200px; /* Increased from 900px for more space on PC screens */
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
}

/* Profile Background */
.profile-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #8844ee, #4466ee);
  z-index: -1;
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
}

/* Back Navigation Button */
.profile-navigation {
  padding: 20px 0;
}

.back-button {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.85);
  border: none;
  border-radius: 20px;
  padding: 8px 15px;
  color: #8844ee;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.back-button:hover {
  background: white;
  transform: translateX(-3px);
}

.back-icon {
  margin-right: 8px;
}

/* Loading Animation */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.pulse-loader {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  animation: pulse 1.2s ease-in-out infinite;
  margin-bottom: 20px;
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.6; }
  50% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.6; }
}

/* Error Container */
.error-container {
  text-align: center;
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin: 80px auto;
  max-width: 450px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.error-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #ff6b6b;
  color: white;
  font-size: 30px;
  line-height: 50px;
  margin: 0 auto 15px;
}

.retry-button {
  background: #4466ee;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 15px;
  margin-top: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(68, 102, 238, 0.3);
}

/* Profile Content */
.profile-content {
  padding: 20px 0;
}

/* Profile Card */
.profile-card {
  background-color: white;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  margin-top: 70px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 30px;
}

/* Fixed Avatar and Settings Position */
.avatar-container {
  position: absolute;
  top: -50px;
  left: 50%;
  transform: translateX(-50%);
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8844ee, #4466ee);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 600;
  border: 4px solid white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

/* Fixed Settings Position - moved away from avatar */
.settings-container {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 5;
}

.gear-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.gear-icon {
  font-size: 18px;
}

.settings-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  width: 180px;
  z-index: 10;
}

.dropdown-item {
  padding: 12px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: #f7f7f7;
}

.dropdown-icon {
  font-size: 16px;
}

.delete-item {
  color: #ef4444;
}

.delete-item:hover {
  background-color: #fee2e2;
}

.user-info {
  margin-top: 50px;
  width: 100%;
}

.username {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 15px 0;
}

.user-meta {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.meta-item {
  color: #64748b;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.meta-icon {
  font-size: 16px;
}

/* Section Cards */
.section-card {
  background-color: white;
  border-radius: 15px;
  padding: 30px; /* Increased from 25px */
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 20px;
}

/* Compatibility Card */
.compatibility-content {
  text-align: center;
}

.compatibility-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.score-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 15px;
  position: relative;
}

.score-circle::before {
  content: '';
  position: absolute;
  top: 5px;
  left: 5px;
  right: 5px;
  bottom: 5px;
  background: white;
  border-radius: 50%;
  z-index: -1;
}

.match-level {
  font-size: 22px;
  font-weight: 600;
  color: #4466ee;
  margin: 0 0 10px 0;
}

.interests-section {
  margin-top: 15px;
}

.interests-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 15px;
  color: #64748b;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.interest-tag {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.artist-tag {
  background-color: rgba(68, 102, 238, 0.15);
  color: #4466ee;
}

.genre-tag {
  background-color: rgba(236, 72, 153, 0.15);
  color: #ec4899;
}

/* Tabs */
.tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 25px;
  gap: 10px;
}

.tab-button {
  background: none;
  border: none;
  padding: 10px 15px;
  font-size: 16px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
}

.tab-button.active {
  color: #4466ee;
}

.tab-button.active::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: #4466ee;
}

.tab-content {
  padding: 10px 0;
}

/* Music Grid */
.music-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); /* Increased from 150px to 180px */
  gap: 25px; /* Slightly increased from 20px */
}

.music-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.music-card:hover {
  transform: translateY(-5px);
}

.music-cover {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1 / 1;
}

.music-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.music-cover:hover .play-overlay {
  opacity: 1;
}

.play-icon {
  width: 50px;
  height: 50px;
  background: white;
  color: #4466ee;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  padding-left: 4px;
}

.music-info {
  padding: 10px 0;
}

.music-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 5px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-artist {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Genres Grid */
.genres-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15px; /* Increased from 12px */
}

.genre-bubble {
  background-color: rgba(136, 68, 238, 0.7);
  background-size: cover;
  background-position: center;
  background-blend-mode: overlay;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.8);
}
/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 500px; /* Increased from 450px */
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-header {
  padding: 20px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.delete-header {
  background-color: #fee2e2;
  color: #b91c1c;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;
}

.modal-body {
  padding: 20px;
  max-width: 100%; /* Ensure content doesn't overflow */
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-input {
  width: 100%;
  box-sizing: border-box; /* Ensure padding doesn't add to width */
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.3s;
  max-width: 100%; /* Prevent overflow */
}

.form-input:focus {
  outline: none;
  border-color: #4466ee;
}

.warning-message {
  text-align: center;
}

.warning-message p {
  margin: 10px 0;
}

.modal-footer {
  padding: 15px 20px;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

.primary-btn, .cancel-btn, .delete-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.primary-btn {
  background: #4466ee;
  color: white;
}

.primary-btn:hover {
  background: #3355dd;
}

.cancel-btn {
  background: #e5e7eb;
  color: #4b5563;
}

.cancel-btn:hover {
  background: #d1d5db;
}

.delete-btn {
  background: #ef4444;
  color: white;
}

.delete-btn:hover {
  background: #dc2626;
}

.empty-section {
  text-align: center;
  padding: 30px;
  color: #64748b;
  font-style: italic;
}

/* Responsive Styles */
@media (max-width: 768px) {
  .music-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
  
  .avatar {
    width: 80px;
    height: 80px;
    font-size: 32px;
  }
  
  .profile-card {
    margin-top: 50px;
  }
  
  .user-meta {
    flex-direction: column;
    gap: 10px;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .tabs {
    gap: 0;
  }
  
  .tab-button {
    padding: 10px;
    font-size: 14px;
  }
  
  .section-title {
    font-size: 18px;
  }
  
  .music-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .profile-content {
    padding-top: 0;
  }
  
  .username {
    font-size: 20px;
  }
  
  .music-info {
    padding: 5px 0;
  }
  
  .music-title {
    font-size: 14px;
  }
  
  .music-artist {
    font-size: 12px;
  }
}
</style>