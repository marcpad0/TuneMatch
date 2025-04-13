<!-- src/components/AuthCallback.vue -->
<template>
  <div class="auth-callback">
    <p>Autenticazione in corso...</p>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "AuthCallback",
  async mounted() {
    try {
      // Get user data including admin status
      const response = await axios.get("http://localhost:3000/auth/me", {
        withCredentials: true,
      });

      if (response.data) {
        // Check if user is admin and redirect accordingly
        if (response.data.isAdmin) {
          this.$router.push("/admin");
        } else {
          this.$router.push("/users");
        }
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      alert("Authentication failed. Please try again.");
      this.$router.push("/");
    }
  },
};
</script>

<style scoped>
.auth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 18px;
}
</style>
