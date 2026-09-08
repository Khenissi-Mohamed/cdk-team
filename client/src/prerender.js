import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { createRouter, createMemoryHistory } from "vue-router";
import PublicHome from "./views/PublicHome.vue";

export async function renderHome(initialData) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: PublicHome }],
  });
  await router.push("/");
  await router.isReady();
  const app = createSSRApp(PublicHome, { initialData });
  app.use(router);
  app.directive("reveal", { getSSRProps: () => ({}) });
  app.directive("parallax", { getSSRProps: () => ({}) });
  return renderToString(app);
}
