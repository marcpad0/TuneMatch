<template>
  <div class="profile-page">
    <div class="profile-navigation">
      <button class="back-button" @click="goBack">
        <span class="back-icon">←</span>
        <span>Torna indietro</span>
      </button>
    </div>

    <div class="profile-background">
      <div class="wave"></div>
    </div>
    
    <div v-if="loading" class="loading-container">
      <div class="pulse-loader"></div>
      <p>Loading profile...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <div class="error-icon">!</div>
      <h3>Something went wrong</h3>
      <p>{{ error }}</p>
      <button @click="fetchUserProfile" class="retry-button">
        <span class="icon">↻</span> Try Again
      </button>
      <button @click="goBack" class="retry-button">
        <span class="icon">←</span> Go Back
      </button>
    </div>

    <div v-else class="profile-content">
      <div class="profile-header-card" v-if="userData">
        <div class="profile-cover-gradient"></div>
        <div class="profile-header">
          <div class="avatar-container">
            <div class="avatar-wrapper">
              <div class="avatar">
                {{ getUserInitials() }}
              </div>
            </div>
          </div>
          
          <div class="user-info">
            <h2 class="username">{{ userData.Username }}</h2>
            <div class="user-meta">
              <span class="meta-item">
                <span class="icon">📍</span>
                {{ userData.Position || 'No Location' }}
              </span>
              <span class="meta-item">
                <span class="icon">🎂</span>
                {{ formatDate(userData.DateBorn) || 'No Birthday' }}
              </span>
            </div>
            
            <div class="action-buttons">
              <button class="secondary-btn" @click="viewPreviousUser" v-if="hasPreviousUser">
                <span class="icon">👤</span> Utente Precedente
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Content Grid -->
      <div class="profile-grid">
        <!-- Now Playing Card -->
        <div v-if="userStatus.currentTrack" class="grid-card now-playing">
          <div class="card-header">
            <div class="live-indicator">
              <div class="live-dot"></div>
              <span>Now Playing</span>
            </div>
          </div>
          <div class="now-playing-content">
            <div class="album-artwork">
              <img 
                :src="userStatus.currentTrack.albumArt || 'https://via.placeholder.com/300'" 
                :alt="userStatus.currentTrack.name" 
              />
              <div class="play-overlay">
                <button @click="openSpotifyTrack(userStatus.currentTrack)" class="spotify-play-btn">
                  <span class="play-icon">▶</span>
                </button>
              </div>
            </div>
            <div class="track-details">
              <h3>{{ userStatus.currentTrack.name }}</h3>
              <p class="artist">{{ userStatus.currentTrack.artist }}</p>
              <div class="music-wave">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Music Compatibility Card -->
        <div v-if="compatibility" class="grid-card compatibility">
          <div class="card-header">
            <h2>Music Compatibility</h2>
          </div>
          <div class="compatibility-content">
            <p class="match-level">
              {{ getMatchLevel(compatibility.score) }}
            </p>
            <div class="shared-interests">
              <h4>Common Interests</h4>
              <div class="tags">
                <div v-for="(artist, index) in compatibility.commonArtists.slice(0, 3)" 
                     :key="'artist-'+index" 
                     class="tag artist-tag">
                  {{ artist }}
                </div>
                <div v-for="(genre, index) in compatibility.commonGenres.slice(0, 3)" 
                     :key="'genre-'+index" 
                     class="tag genre-tag">
                  {{ genre }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Music Tastes Section -->
      <div class="music-tastes-section">
        <h2>Music Tastes</h2>
        
        <div class="tabs">
          <button 
            v-for="tab in ['tracks', 'artists', 'genres']"
            :key="tab"
            class="tab" 
            :class="{ active: activeTab === tab }" 
            @click="activeTab = tab"
          >
            {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
          </button>
        </div>
        
        <!-- Tracks Tab -->
        <div v-if="activeTab === 'tracks'" class="tab-content">
          <div class="music-grid">
            <div v-for="(track, index) in favorites.tracks" :key="index" class="music-card track-card">
              <div class="music-card-image">
                <img :src="track.image || 'https://via.placeholder.com/150'" :alt="track.name" />
                <div class="hover-overlay">
                  <button @click="openSpotifyTrack(track)" class="play-btn">
                    <span>▶</span>
                  </button>
                </div>
              </div>
              <div class="music-card-info">
                <h3>{{ track.name }}</h3>
                <p>{{ track.artist }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Artists Tab -->
        <div v-if="activeTab === 'artists'" class="tab-content">
          <div class="music-grid">
            <div v-for="(artist, index) in favorites.artists" :key="index" class="music-card artist-card">
              <div class="music-card-image">
                <img :src="artist.image || 'https://via.placeholder.com/150'" :alt="artist.name" />
                <div class="artist-overlay"></div>
              </div>
              <div class="music-card-info">
                <h3>{{ artist.name }}</h3>
                <p>{{ artist.genres ? artist.genres.slice(0, 2).join(', ') : 'No genres' }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Genres Tab -->
        <div v-if="activeTab === 'genres'" class="tab-content">
          <div class="genres-container">
            <div v-for="(genre, index) in favorites.genres" :key="index" class="genre-bubble">
              {{ genre }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Message Dialog -->
    <div v-if="showMessageDialog" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>Message {{ user.Username }}</h3>
          <button @click="closeMessageDialog" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <textarea 
            v-model="messageContent" 
            class="message-input" 
            placeholder="Write your message..."
            rows="4"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button @click="closeMessageDialog" class="cancel-btn">Cancel</button>
          <button @click="sendMessage" class="send-btn" :disabled="!messageContent.trim()">
            Send Message
          </button>
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
      user: {},
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
      showMessageDialog: false,
      messageContent: "",
      socket: null,
      userOnlineStatus: false,
      previousUsers: [],
      ws: null,
    };
  },
  computed: {
    hasPreviousUser() {
      return this.previousUsers.length > 0;
    }
  },
  async mounted() {
    try {
      await this.fetchUserData(this.userId);
      this.connectToSocket();
    } catch (error) {
      this.error = "Failed to load user profile";
      this.loading = false;
      console.error(error);
    }
    this.fetchUserProfile();
  },
  beforeUnmount() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    if (this.ws) {
      this.ws.close();
    }
  },
  methods: {
    async fetchUserProfile() {
      this.loading = true;
      this.error = null;
      
      try {
        // Fetch user basic info
        const userResponse = await axios.get(`http://localhost:3000/users/${this.userId}`, {
          withCredentials: true
        });
        
        this.user = userResponse.data;
        
        // Fetch user's favorite music
        const favoritesResponse = await axios.get(`http://localhost:3000/users/${this.userId}/favorites`, {
          withCredentials: true
        });
        
        this.favorites = favoritesResponse.data;
        
        // Check if logged in user and calculate compatibility
        try {
          const meResponse = await axios.get("http://localhost:3000/auth/me", {
            withCredentials: true
          });
          
          if (meResponse.data && meResponse.data.id !== parseInt(this.userId)) {
            // Calculate music compatibility
            const compatibilityResponse = await axios.get(
              `http://localhost:3000/users/compatibility/${meResponse.data.id}/${this.userId}`, 
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

    connectToSocket() {
      // Use WebSocket directly instead of Socket.IO
      try {
        const wsUrl = "ws://localhost:3000"; // Use the ws:// protocol for WebSocket
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          console.log("WebSocket connection established");
          // Send user ID to check status when connection opens
          this.socket.send(JSON.stringify({
            type: "checkUserStatus",
            userId: this.userId
          }));
        };
        
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "userStatus" && data.userId === parseInt(this.userId)) {
              this.userStatus = {
                online: data.online,
                currentTrack: data.currentTrack
              };
              this.userOnlineStatus = data.online;
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };
        
        this.socket.onclose = (event) => {
          console.log("WebSocket connection closed. Code:", event.code);
          // Try to reconnect after 5 seconds
          setTimeout(() => this.connectToSocket(), 5000);
        };
        
        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      } catch (error) {
        console.error("Failed to establish WebSocket connection:", error);
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return "Unknown";
      const options = { year: "numeric", month: "long", day: "numeric" };
      return new Date(dateString).toLocaleDateString(undefined, options);
    },
    
    openSpotifyTrack(track) {
      if (track && track.spotifyUrl) {
        window.open(track.spotifyUrl, "_blank");
      }
    },
    
    openMessageDialog() {
      this.showMessageDialog = true;
    },
    
    closeMessageDialog() {
      this.showMessageDialog = false;
      this.messageContent = "";
    },
    
    async sendMessage() {
      try {
        await axios.post("http://localhost:3000/messages", {
          recipientId: this.userId,
          content: this.messageContent
        }, {
          withCredentials: true
        });
        
        this.closeMessageDialog();
        alert("Message sent successfully!");
      } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message. Please try again.");
      }
    },
    
    getMatchLevel(score) {
      if (score >= 90) return "Perfect Match!";
      if (score >= 75) return "Great Match";
      if (score >= 60) return "Good Match";
      if (score >= 45) return "Fair Match";
      return "Some Similarities";
    },

    goBack() {
      this.$router.back();
    },
    
    viewPreviousUser() {
      if (this.previousUsers.length) {
        const prevUserId = this.previousUsers.pop();
        this.$router.push(`/profile/${prevUserId}`);
      }
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
        }
      }
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

/* ===== BASE STYLES ===== */
.profile-page {
  font-family: 'Poppins', sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  color: #2c3e50;
  position: relative;
  min-height: 100vh;
}

/* ===== BACKGROUND DESIGN ===== */
.profile-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 260px;
  background: linear-gradient(135deg, #8844ee, #4466ee);
  z-index: -1;
  overflow: hidden;
}

.wave {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23ffffff' fill-opacity='1' d='M0,128L48,149.3C96,171,192,213,288,224C384,235,480,213,576,186.7C672,160,768,128,864,133.3C960,139,1056,181,1152,186.7C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E") no-repeat bottom;
  background-size: cover;
}

/* ===== LOADING STATE ===== */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: white;
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
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
}

/* ===== ERROR STATE ===== */
.error-container {
  text-align: center;
  background: white;
  border-radius: 12px;
  padding: 40px;
  margin: 80px auto;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.error-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #ff6b6b;
  color: white;
  font-size: 40px;
  line-height: 60px;
  margin: 0 auto 20px;
}

.retry-button {
  background: #4466ee;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 20px;
  display: inline-flex;
  align-items: center;
}

.retry-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(68, 102, 238, 0.3);
}

.retry-button .icon {
  margin-right: 8px;
}

/* ===== PROFILE CONTENT ===== */
.profile-content {
  padding: 20px;
}

/* ===== PROFILE HEADER CARD ===== */
.profile-header-card {
  background: white;
  border-radius: 12px;
  padding: 0;
  margin-top: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.profile-cover-gradient {
  height: 120px;
  background: linear-gradient(to right, #8e2de2, #4a00e0);
}

.profile-header {
  display: flex;
  padding: 0 30px 30px;
  position: relative;
}

.avatar-container {
  margin-top: -50px;
  position: relative;
}

.avatar-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  padding: 4px;
  background: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #8844ee, #4466ee);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 600;
}

.status-badge {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 3px solid white;
  bottom: 0;
  right: 0;
  z-index: 1;
}

.status-badge.online {
  background-color: #2ecc71;
}

.status-badge.offline {
  background-color: #e74c3c;
}

.user-info {
  margin-left: 25px;
  padding-top: 10px;
}

.username {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 10px 0;
}

.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
  align-items: center;
}

.meta-item {
  display: flex;
  align-items: center;
  color: #718096;
  font-size: 14px;
}

.icon {
  margin-right: 6px;
  font-size: 16px;
}

.status-pill {
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-pill.online {
  background-color: rgba(46, 204, 113, 0.15);
  color: #2ecc71;
}

.status-pill.offline {
  background-color: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin-top: 10px;
}

.primary-btn, .secondary-btn {
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
}

.primary-btn {
  background: #4466ee;
  color: white;
  box-shadow: 0 5px 15px rgba(68, 102, 238, 0.3);
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(68, 102, 238, 0.4);
}

.secondary-btn {
  background: #f1f5f9;
  color: #4b5563;
}

.secondary-btn:hover {
  background: #e5e7eb;
}

/* ===== CONTENT GRID ===== */
.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.grid-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s, box-shadow 0.3s;
}

.grid-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.card-header {
  padding: 15px 20px;
  border-bottom: 1px solid #f1f5f9;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

/* ===== NOW PLAYING CARD ===== */
.now-playing .card-header {
  padding: 15px 20px;
  border-bottom: none;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ef4444;
  font-weight: 600;
  font-size: 16px;
}

.live-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ef4444;
  animation: pulse-red 1.5s infinite;
}

@keyframes pulse-red {
  0% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
}

.now-playing-content {
  padding: 0 20px 20px;
}

.album-artwork {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 15px;
}

.album-artwork img {
  width: 100%;
  height: auto;
  display: block;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.album-artwork:hover .play-overlay {
  opacity: 1;
}

.spotify-play-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #1db954;
  border: none;
  color: white;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.spotify-play-btn:hover {
  transform: scale(1.1);
}

.track-details h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
  font-weight: 600;
}

.track-details .artist {
  color: #718096;
  margin: 0 0 15px 0;
}

.music-wave {
  display: flex;
  align-items: flex-end;
  height: 30px;
  gap: 3px;
}

.music-wave span {
  display: block;
  width: 6px;
  background-color: #4466ee;
  border-radius: 3px;
  animation: wave 1.2s infinite ease-in-out;
}

.music-wave span:nth-child(1) { height: 60%; animation-delay: 0.2s; }
.music-wave span:nth-child(2) { height: 90%; animation-delay: 0.4s; }
.music-wave span:nth-child(3) { height: 100%; animation-delay: 0.6s; }
.music-wave span:nth-child(4) { height: 70%; animation-delay: 0.8s; }
.music-wave span:nth-child(5) { height: 40%; animation-delay: 1s; }

@keyframes wave {
  0%, 100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(0.6);
  }
}

/* ===== COMPATIBILITY CARD ===== */
.compatibility-content {
  padding: 20px;
  text-align: center;
}

.score-circle {
  width: 150px;
  height: 150px;
  margin: 0 auto 20px;
}

.circular-chart {
  width: 100%;
  height: 100%;
}

.circle-bg {
  fill: none;
  stroke: #eee;
  stroke-width: 3;
}

.circle {
  fill: none;
  stroke-width: 3;
  stroke: #4466ee;
  stroke-linecap: round;
  animation: progress 1.5s ease-out forwards;
}

@keyframes progress {
  0% {
    stroke-dasharray: "0, 100";
  }
}

.percentage {
  fill: #4466ee;
  font-size: 8px;
  font-weight: bold;
  text-anchor: middle;
}

.match-level {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #4466ee;
}

.shared-interests h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 500;
  color: #64748b;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.tag {
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 13px;
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

/* ===== MUSIC TASTES SECTION ===== */
.music-tastes-section {
  background: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.music-tastes-section h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 600;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 20px;
}

.tab {
  background: none;
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  position: relative;
  transition: color 0.3s;
}

.tab.active {
  color: #4466ee;
}

.tab.active::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 3px;
  background: #4466ee;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
}

.music-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.music-card {
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
  background: white;
}

.music-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
}

.music-card-image {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}

.music-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.music-card-image:hover .hover-overlay {
  opacity: 1;
}

.music-card-image:hover img {
  transform: scale(1.05);
}

.play-btn {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background: white;
  border: none;
  color: #4466ee;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.play-btn:hover {
  transform: scale(1.1);
}

.artist-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
}

.music-card-info {
  padding: 15px;
}

.music-card-info h3 {
  margin: 0 0 5px 0;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.music-card-info p {
  margin: 0;
  color: #718096;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.genres-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  padding: 10px 0;
}

.genre-bubble {
  background: linear-gradient(135deg, #8844ee, #4466ee);
  color: white;
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 15px;
  font-weight: 500;
  box-shadow: 0 5px 10px rgba(68, 102, 238, 0.2);
  transition: transform 0.3s, box-shadow 0.3s;
}

.genre-bubble:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 15px rgba(68, 102, 238, 0.3);
}

/* ===== MESSAGE MODAL ===== */
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
  max-width: 500px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-header {
  padding: 20px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
}

.modal-body {
  padding: 20px;
}

.message-input {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  font-family: inherit;
  font-size: 15px;
  resize: none;
  transition: border-color 0.3s;
}

.message-input:focus {
  outline: none;
  border-color: #4466ee;
}

.modal-footer {
  padding: 15px 20px;
  background: #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

.cancel-btn, .send-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.cancel-btn {
  background: #e5e7eb;
  color: #4b5563;
}

.send-btn {
  background: #4466ee;
  color: white;
}

.send-btn:disabled {
  background: #a1a1aa;
  cursor: not-allowed;
}

/* ===== PROFILE NAVIGATION ===== */
.profile-navigation {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
}

.back-button {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #4466ee;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.back-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: white;
}

.back-icon {
  font-size: 16px;
  transition: transform 0.3s ease;
}

.back-button:hover .back-icon {
  transform: translateX(-3px);
}

/* ===== RESPONSIVE STYLES ===== */
@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .avatar-container {
    margin-top: -70px;
  }
  
  .avatar-wrapper {
    width: 140px;
    height: 140px;
  }
  
  .user-info {
    margin-left: 0;
    margin-top: 15px;
    padding-top: 0;
  }
  
  .user-meta {
    justify-content: center;
  }
  
  .action-buttons {
    justify-content: center;
    margin-top: 20px;
  }
  
  .now-playing-content {
    text-align: center;
  }
  
  .tabs {
    overflow-x: auto;
    padding-bottom: 5px;
  }
}

@media (max-width: 480px) {
  .music-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
  
  .profile-content {
    padding: 10px;
  }
  
  .music-tastes-section {
    padding: 15px;
  }
}
</style>