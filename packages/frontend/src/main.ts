import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from 'element-plus'
import { router } from "./router";
import App from "./App.vue";
import 'element-plus/dist/index.css'
import "./style.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(ElementPlus);
app.mount("#app");