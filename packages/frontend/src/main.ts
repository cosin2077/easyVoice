import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from 'element-plus'
import { router } from "./router";
import App from "./App.vue";
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import 'element-plus/dist/index.css'
import "./styles/base.less";
import { attachAuthInterceptors } from "./api/http";

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);
app.use(router);
app.use(ElementPlus);
attachAuthInterceptors();
app.mount("#app");