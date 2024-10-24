import { createRouter, createWebHistory } from 'vue-router';
import Register from '../components/todo-item.vue';
import Login from '../components/todo-item2.vue';
import UserList from '../components/UserList.vue';

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

// Route Guard
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const isAdmin = localStorage.getItem("isAdmin");
  const userId = localStorage.getItem("userId");

  if (requiresAuth) {
    if (isAdmin === null || userId === null) {
      next({ name: 'login' });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
