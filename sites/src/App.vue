<template>
  <div id="app">
    <nav class="navbar">
      <div class="navbar-container">
        <router-link to="/" class="navbar-brand">
          <span class="logo-icon">♪</span>
          <span class="brand-name">TuneMatch</span>
        </router-link>
        
        <div class="navbar-links">
          <!-- Show these links only when user is NOT authenticated -->
          <template v-if="!isAuthenticated">
            <router-link to="/register">Register</router-link>
            <router-link to="/">Login</router-link>
          </template>
          
          <!-- Show logout button when user is authenticated -->
          <a v-else href="#" @click.prevent="logout" class="logout-link">Logout</a>
        </div>
      </div>
    </nav>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      isAuthenticated: false
    };
  },
  methods: {
    async checkAuthStatus() {
      try {
        const response = await axios.get("http://localhost:3000/auth/check-session", {
          withCredentials: true
        });
        this.isAuthenticated = response.data.authenticated;
      } catch (error) {
        console.error("Auth check error:", error);
        this.isAuthenticated = false;
      }
    },
    async logout() {
      try {
        await axios.post("http://localhost:3000/logout", {}, {
          withCredentials: true
        });
        this.isAuthenticated = false;
        this.$router.push("/");
      } catch (error) {
        console.error("Logout error:", error);
        alert("Error during logout. Please try again.");
      }
    }
  },
  mounted() {
    this.checkAuthStatus();
    
    // Listen for route changes to check auth status
    this.$router.beforeEach((to, from, next) => {
      this.checkAuthStatus();
      next();
    });
  }
}
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap");

#app {
  font-family: "Quicksand", sans-serif;
  color: #2c3e50;
  background-color: #f0f4f8;
  margin: 0;
  padding: 0;
  min-height: 100vh;
}

.navbar {
  background: linear-gradient(135deg, #8e44ad, #3498db);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.navbar-brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: white;
}

.logo-icon {
  font-size: 28px;
  margin-right: 8px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.brand-name {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.navbar-links {
  display: flex;
  gap: 20px;
}

.navbar-links a {
  color: white;
  text-decoration: none;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.navbar-links a:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.navbar-links a.router-link-exact-active {
  background-color: white;
  color: #8e44ad;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.logout-link {
  color: white;
  text-decoration: none;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.logout-link:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* Adjusted styles for main content */
main.content {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Styles for the login container */
.login-container {
  width: 100%;
  max-width: 400px;
  padding: 40px 30px;
  background-color: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Optional: Add some margin for small screens */
@media (max-width: 600px) {
  .login-container {
    margin: 20px;
    padding: 30px 20px;
  }
  
  .navbar-container {
    flex-direction: column;
    gap: 10px;
  }
  
  .navbar-links {
    width: 100%;
    justify-content: center;
  }
}
</style>