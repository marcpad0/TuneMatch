<template>
  <nav>
    <ul class="nav-links">
      <li><router-link to="/register">Register</router-link></li>
      <li><router-link to="/">Login</router-link></li>
    </ul>
  </nav>
  <main class="content">
      <!-- Your login form or component will be rendered here -->
      <router-view />
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500&display=swap');

#app {
  font-family: 'Quicksand', sans-serif;
  color: #2c3e50;
  background-color: #f0f4f8;
  margin: 0;
  padding: 0;
}

nav {
  background-color: #fff;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 15px 30px;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-links {
  list-style: none;
  display: flex;
  justify-content: flex-end;
  margin: 0;
}

.nav-links li {
  margin-left: 20px;
}

.nav-links a {
  text-decoration: none;
  color: #2c3e50;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: #42b983;
}

.nav-links a.router-link-exact-active {
  color: #42b983;
}

/* Adjusted styles for main content */
main.content {
  min-height: calc(100vh - 70px); /* Adjust as per the height of your nav */
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
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

/* Optional: Add some margin for small screens */
@media (max-width: 600px) {
  .login-container {
    margin: 20px;
    padding: 30px 20px;
  }
}
</style>
