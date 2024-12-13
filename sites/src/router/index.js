// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Register from '../components/todo-item.vue';
import Login from '../components/todo-item2.vue';
import UserList from '../components/UserList.vue';
import AuthCallback from '../components/AuthCallback.vue'; // Import the new component

const routes = [
  {
    path: '/',
    name: 'login',
    component: Login,
  },
  {
    path: '/register',
    name: 'register',
    component: Register,
  },
  {
    path: '/users',
    name: 'userlist',
    component: UserList,
    meta: { requiresAuth: true },
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: AuthCallback,
  },
  // Redirect any unknown paths to login
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

import axios from 'axios';

// Route Guard
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  try {
    const response = await axios.get('http://37.27.206.153:3000/auth/check-session', {
      withCredentials: true 
    });
    
    const isAuthenticated = response.data.authenticated;

    if (requiresAuth && !isAuthenticated) {
      next({ name: 'login' });
    } else if (to.name === 'login' && isAuthenticated) {
      next({ name: 'userlist' });
    } else if (to.name === 'register' && isAuthenticated) {
      next({ name: 'userlist' });
    }
    else {
      next();
    }
  } catch (error) {
    if (requiresAuth) {
      next({ name: 'login' });
    } else {
      next();
    }
  }
});

export default router;
