import { test, expect } from 'vitest'
import { mount } from "@vue/test-utils";
import Home from "@/views/Home.vue";

test("renders correctly", () => {
  const wrapper = mount(Home);
  expect(wrapper.text()).toContain("EasyVoice智能小说转语音解决方案");
});

test("voices api ok", () => {

})