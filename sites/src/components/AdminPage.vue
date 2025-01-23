<!-- src/components/AdminPage.vue -->
<template>
  <div class="admin-container">
    <div class="admin-card">
      <!-- Header Section -->
      <div class="header-section">
        <h1 class="title">Admin Dashboard</h1>
        <button class="logout-button" @click="logout">Logout</button>
      </div>

      <!-- Users Cards Section -->
      <div class="users-cards">
        <div
          v-for="user in users"
          :key="user.id"
          class="user-card"
        >
          <div class="user-card-header">
            <strong>{{ user.Username }}</strong>
            <div class="user-actions">
              <button @click="editUser(user)" class="action-button edit-button">Edit</button>
              <button @click="deleteUser(user.id)" class="action-button delete-button">Delete</button>
            </div>
          </div>
          <div class="user-card-content">
            <p><strong>Email Spotify:</strong> {{ user.emailSpotify }}</p>
            <p><strong>Email Twitch:</strong> {{ user.emailTwitch }}</p>
            <p><strong>Email Google:</strong> {{ user.emailGoogle }}</p>
            <p><strong>Position:</strong> {{ user.Position }}</p>
            <p><strong>Date Born:</strong> {{ formatDate(user.DateBorn) }}</p>
            <p><strong>Admin:</strong> {{ user.isAdmin ? 'Yes' : 'No' }}</p>
          </div>
        </div>
      </div>

      <!-- Edit User Modal -->
      <div v-if="showModal" class="modal">
        <div class="modal-content">
          <span class="close" @click="closeModal">&times;</span>
          <h2>Edit User</h2>
          <form @submit.prevent="updateUser">
            <div class="modal-grid">
              <div class="input-group">
                <label>Username:</label>
                <input v-model="editingUser.Username" type="text" required class="cute-input">
              </div>
              <div class="input-group">
                <label>Position:</label>
                <input v-model="editingUser.Position" type="text" class="cute-input">
              </div>
              <div class="input-group">
                <label>Date Born:</label>
                <input v-model="editingUser.DateBorn" type="date" class="cute-input">
              </div>
              <div class="input-group checkbox-group">
                <label>Is Admin:</label>
                <input v-model="editingUser.isAdmin" type="checkbox">
              </div>
            </div>
            <div class="modal-buttons">
              <button type="submit" class="save-btn">Save</button>
              <button type="button" @click="closeModal" class="cancel-btn">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'AdminPage',
  data() {
    return {
      users: [],
      showModal: false,
      editingUser: {}
    }
  },
  async created() {
    await this.loadUsers();
  },
  methods: {
    async loadUsers() {
      try {
        const response = await axios.get('http://37.27.206.153:3000/users', {
          withCredentials: true
        });
        this.users = response.data;
      } catch (error) {
        console.error('Error loading users:', error);
        alert('Error loading users');
      }
    },
    editUser(user) {
      this.editingUser = { ...user };
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.editingUser = {};
    },
    async updateUser() {
      try {
        await axios.put(
          `http://37.27.206.153:3000/users/${this.editingUser.id}`, 
          this.editingUser,
          {
            withCredentials: true,
            headers: {
              'isadmin': 'true',
              'userid': this.editingUser.id
            }
          }
        );
        await this.loadUsers();
        this.closeModal();
      } catch (error) {
        console.error('Error updating user:', error);
        alert('Error updating user');
      }
    },
    async deleteUser(userId) {
      if (confirm('Are you sure you want to delete this user?')) {
        try {
          await axios.delete(`http://37.27.206.153:3000/users/${userId}`, {
            withCredentials: true,
            headers: {
              'isadmin': 'true',
              'userid': userId
            }
          });
          await this.loadUsers();
        } catch (error) {
          console.error('Error deleting user:', error);
          alert('Error deleting user');
        }
      }
    },
    formatDate(date) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(date).toLocaleDateString(undefined, options);
    },
    async logout() {
      try {
        await axios.post('http://37.27.206.153:3000/logout', {}, {
          withCredentials: true
        });
        this.$router.push("/");
      } catch (error) {
        console.error('Logout error:', error);
        alert("Error during logout.");
      }
    }
  }
}
</script>

<style scoped>
/* Global Box-Sizing */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Container Padding */
.admin-container {
  padding: 20px;
}

/* Admin Card Styling */
.admin-card {
  background-color: #ffffff;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  margin: 20px 0;
}

/* Header Section */
.header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.title {
  font-size: 28px;
  margin: 0;
}

/* Logout Button */
.logout-button {
  background-color: #ff6b6b;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.logout-button:hover {
  background-color: #ff4d4d;
}

/* Users Cards Section */
.users-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

/* User Card Styling */
.user-card {
  background-color: #fdfdfd;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.user-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.user-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.user-card-content p {
  margin: 5px 0;
  font-size: 16px;
}

/* User Actions */
.user-actions {
  display: flex;
  gap: 10px;
}

/* Action Buttons */
.action-button {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.edit-button {
  background-color: #6bcf77;
  color: white;
}

.edit-button:hover {
  background-color: #57a861;
}

.delete-button {
  background-color: #ff6b6b;
  color: white;
}

.delete-button:hover {
  background-color: #ff4d4d;
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

.modal-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
}

.input-group label {
  margin-bottom: 5px;
  font-weight: bold;
}

.cute-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #ccc;
  border-radius: 12px;
  font-size: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  background-color: #fafafa;
}

.cute-input:focus {
  border-color: #6bcf77;
  box-shadow: 0 0 8px rgba(107, 207, 119, 0.5);
  outline: none;
}

/* Checkbox Group */
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Modal Buttons */
.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.save-btn {
  background-color: #6bcf77;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.save-btn:hover {
  background-color: #57a861;
}

.cancel-btn {
  background-color: #ccc;
  color: #333;
  border: none;
  padding: 10px 20px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.cancel-btn:hover {
  background-color: #b3b3b3;
}

/* Responsive Styles */

/* Tablet and larger */
@media (min-width: 768px) {
  .users-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .modal-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .users-cards {
    grid-template-columns: repeat(3, 1fr);
  }

  .modal-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile Adjustments */
@media (max-width: 480px) {
  .admin-card {
    padding: 20px;
  }

  .header-section {
    gap: 15px;
  }

  .title {
    font-size: 24px;
  }

  .logout-button {
    padding: 10px 20px;
    font-size: 14px;
  }

  .user-card-content p {
    font-size: 14px;
  }

  .action-button {
    padding: 6px 12px;
    font-size: 12px;
  }

  .modal-content {
    padding: 20px;
  }

  .modal-grid {
    grid-template-columns: 1fr;
  }

  .modal-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .save-btn,
  .cancel-btn {
    width: 100%;
    margin-bottom: 10px;
  }
}
</style>
