declare module 'prettier-plugin-svelte/browser' {
  import { Plugin } from 'prettier';

  const plugin: Plugin;
  export default plugin;
  export = plugin;
}
