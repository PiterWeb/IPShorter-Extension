<script>
  import {
    URLSended,
    ApiKey,
    ApiKeyRequest,
    uri
  } from "./stores/stores.js";

  import Fotter from "./components/Fotter.svelte";
  import Header from "./components/Header.svelte";
  import ApiKeyView from "./components/ApiKeyView.svelte";
  import CreateLogger from "./components/CreateLogger.svelte";
  import LoggerView from "./components/LoggerView.svelte";
  import LoggerList from "./components/LoggerList.svelte";

</script>

<main
  class="overflow-hidden px60 py-10 bg-gray-600 border-4 border-warm-gray-400 rounded"
>

 <Header />

  <article class="py-4 px-60 overflow-hidden mx-auto container">

    {#if $ApiKeyRequest}

    <ApiKeyView/>

    {:else}

    <CreateLogger/>

    {/if}

  </article>

  <LoggerList/>

  <Fotter />

</main>

<style lang="postcss" global>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  a:visited {
    color: inherit;
  }

</style>
