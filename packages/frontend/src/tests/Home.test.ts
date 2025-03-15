// tests/Home.test.ts
import { mount } from "@vue/test-utils";
import Home from "@/views/Home.vue";

test("renders correctly", () => {
  const wrapper = mount(Home);
  expect(wrapper.text()).toContain("生成配音");
});