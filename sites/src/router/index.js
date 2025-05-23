// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import Register from "../components/todo-item.vue";
import Login from "../components/todo-item2.vue";
import UserList from "../components/UserList.vue";
import AuthCallback from "../components/AuthCallback.vue"; // Import the new component
import AdminPage from "../components/AdminPage.vue";
import ProfilePage from "../components/ProfilePage.vue"; // Import the new component

const routes = [
  {
    path: "/",
    name: "login",
    component: Login,
  },
  {
    path: "/register",
    name: "register",
    component: Register,
  },
  {
    path: "/users",
    name: "userlist",
    component: UserList,
    meta: { requiresAuth: true },
  },
  {
    path: "/auth/callback",
    name: "auth-callback",
    component: AuthCallback,
  },
  {
    path: "/profile/:userId",
    name: "profile",
    component: ProfilePage,
    props: true,
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
  {
    path: "/admin",
    name: "admin",
    component: AdminPage,
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

import axios from "axios";

// Route Guard
// src/router/index.js - Updated router guard section

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);
  const isAuthPage = to.name === "login" || to.name === "register";

  try {
    const response = await axios.get(
      "http://localhost:3000/auth/check-session",
      {
        withCredentials: true,
      }
    );

    console.log("Auth check response:", response.data);  // Debug response data
    
    const isAuthenticated = response.data.authenticated;
    const isAdmin = Boolean(response.data.user?.isAdmin);  // Force boolean conversion
    
    console.log("isAuthenticated:", isAuthenticated, "isAdmin:", isAdmin);  // Debug auth status

    if (requiresAuth && !isAuthenticated) {
      next({ name: "login" });
    } else if (requiresAdmin && !isAdmin) {
      next({ name: "userlist" });
    } else if (isAuthPage && isAuthenticated) {
      // Redirect authenticated users away from login/register pages
      next({ name: isAdmin ? "admin" : "userlist" });
    } else {
      next();
    }
  } catch (error) {
    console.error("Auth check error:", error);
    if (requiresAuth) {
      next({ name: "login" });
    } else {
      next();
    }
  }
});

export default router;
