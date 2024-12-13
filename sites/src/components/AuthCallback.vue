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
      // Make a request to the backend to get the user info
      const response = await axios.get("http://37.27.206.153:3000/auth/me", {
        withCredentials: true, // Send cookies with the request
      });

      // Set localStorage with the user info
      localStorage.setItem("isAdmin", response.data.isAdmin.toString());
      localStorage.setItem("userId", response.data.userId.toString());

      // Redirect to the user list
      this.$router.push("/users");
    } catch (error) {
      alert("Errore nell'autenticazione:", error);
      alert("Autenticazione fallita. Riprova.");
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
