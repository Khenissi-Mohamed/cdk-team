import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "../composables/useAuth";

const routes = [
  {
    path: "/",
    name: "accueil",
    component: () => import("../views/PublicHome.vue"),
  },
  {
    path: "/mentions-legales",
    name: "mentions-legales",
    component: () => import("../views/MentionsLegales.vue"),
  },
  {
    path: "/politique-de-confidentialite",
    name: "politique-confidentialite",
    component: () => import("../views/PolitiqueConfidentialite.vue"),
  },
  {
    path: "/admin/connexion",
    name: "admin-login",
    component: () => import("../views/admin/AdminLogin.vue"),
  },
  {
    path: "/admin/mot-de-passe-oublie",
    name: "admin-forgot-password",
    component: () => import("../views/admin/ForgotPassword.vue"),
  },
  {
    path: "/admin/reinitialiser-mot-de-passe",
    name: "admin-reset-password",
    component: () => import("../views/admin/ResetPassword.vue"),
  },
  {
    path: "/admin",
    component: () => import("../views/admin/AdminLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      { path: "", name: "admin-dashboard", component: () => import("../views/admin/AdminDashboard.vue") },
      { path: "planning", name: "admin-cours", component: () => import("../views/admin/AdminCours.vue") },
      { path: "coachs", name: "admin-coachs", component: () => import("../views/admin/AdminCoachs.vue") },
      { path: "tarifs", name: "admin-tarifs", component: () => import("../views/admin/AdminTarifs.vue") },
      { path: "documents", name: "admin-documents", component: () => import("../views/admin/AdminDocuments.vue") },
      { path: "contenu", name: "admin-settings", component: () => import("../views/admin/AdminSettings.vue") },
      { path: "compte", name: "admin-compte", component: () => import("../views/admin/AdminCompte.vue") },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  const { isAuthenticated } = useAuth();
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { name: "admin-login", query: { redirect: to.fullPath } };
  }
});

export default router;
