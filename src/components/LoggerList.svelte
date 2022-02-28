<script>
  import LoggerView from "./LoggerView.svelte";
  import { uri, ApiKey, LoggerReq, Logger } from "../stores/stores.js";

  const goto = (id) => {
    if ($Logger == id) {
      LoggerReq.update((value) => !value);
      Logger.set("");
    } else {
      LoggerReq.set(false);
      Logger.set(id);
      setTimeout(() => {
        LoggerReq.set(true);
      }, 100);
    }
  };

  const fetchLoggers = (async () => {
    const response = await fetch(`${uri}/api/getLoggers/` + $ApiKey);

    const data = await response.json();

    if (response.status !== (200 || 300)) {
      console.error(data);
      throw new Error(data.message);
    }
    return data;
  })();
</script>

{#if $ApiKey != ""}
{#await fetchLoggers}
  <p class="font-bold text-center my-2">
    No loggers found or still searching it
  </p>
{:then data}
  <div class="Rtable Rtable--4cols">
    <div style="order:1;" class="Rtable-cell">
      <h3><strong>Shorted URL</strong></h3>
    </div>
    <div style="order:1;" class="Rtable-cell">
      <h3><strong>Clicks</strong></h3>
    </div>
    <div style="order:1;" class="Rtable-cell">
      <h3><strong>Last Visitor</strong></h3>
    </div>
    <div style="order:1;" class="Rtable-cell">
      <h3><strong>Url</strong></h3>
    </div>

    {#each data as logger}
      <div style="order:2;" class="Rtable-cell">
        <a
          href={uri + "/" + logger.Id}
          target="_blank"
          class="valueTable text-blue-400 visited:text-blue-400">{logger.Id}</a
        ><button
          class="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 ml-[4px] px-3 rounded"
          on:click={() => goto(logger.Id)}>More</button
        >
      </div>
      {#if logger.Clicks}
        <div style="order:2;" class="Rtable-cell">
          <h3 class="valueTable">{logger.Clicks}</h3>
        </div>
      {:else}
        <div style="order:2;" class="Rtable-cell">
          <h3 class="valueTable">0</h3>
        </div>
      {/if}
      {#if logger.Visitors?.length > 0}
        <div style="order:2;" class="Rtable-cell">
          <h3 class="valueTable">
            {logger.Visitors[logger.Visitors.length - 1].IP}
          </h3>
        </div>
      {:else}
        <div style="order:2;" class="Rtable-cell">
          <h3 class="valueTabl">No Visitor</h3>
        </div>
      {/if}
      <div style="order:2;" class="Rtable-cell">
        <a
          href={logger.Url}
          target="_blank"
          class="valueTable text-blue-400 visited:text-blue-400">{logger.Url}</a
        >
      </div>
    {/each}
  </div>
{:catch error}
  <p class="font-bold text-red-500">Error loading loggers: {error}</p>
{/await}

{#if $LoggerReq}
  <LoggerView />
{/if}

{/if}

<style>
  :root {
    --bw: 3px;
  }

  .valueTable {
    overflow-wrap: break-word;
    word-wrap: break-word;
    hyphens: auto;
    white-space: normal;
  }

  .Rtable {
    display: flex;
    flex-wrap: wrap;
    margin: 0 0 3em 0;
    padding: 0;
  }

  .Rtable-cell {
    box-sizing: border-box;
    flex-grow: 1;
    width: 100%;
    padding: 0.8em 1.2em;
    overflow: hidden;
    list-style: none;
    border: solid var(--bw) white;
    background: fade(slategrey, 20%);
  }

  .Rtable--4cols > .Rtable-cell {
    width: 25%;
  }
</style>
