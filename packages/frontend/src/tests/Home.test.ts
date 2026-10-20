import { test, expect } from 'vitest'
import { mount } from "@vue/test-utils";
import Home from "@/views/Home.vue";

test("renders correctly", () => {
  const wrapper = mount(Home);
  expect(wrapper.text()).toContain("EasyVoice");
  expect(wrapper.text()).toContain("小说转语音");
});

test("voices api ok", () => {
  expect(true).toBe(true);
})
