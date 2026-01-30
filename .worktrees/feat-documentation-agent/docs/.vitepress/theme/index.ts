import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import './style.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Register any global components here if needed
  },
} satisfies Theme;
