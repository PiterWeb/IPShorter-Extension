<script>
  import { LoggerReq, ApiKey, Logger, uri, URLSended } from "../stores/stores.js";

  const fetchLogger = (async () => {
    const response = await fetch(
      uri + "/api/getLogger/" + $ApiKey + "/" + $Logger
    );
    if (response.status !== (200 || 300)) {
      console.error(`Status :${response.status} on response`);
      return {};
    }
    const data = await response.json();
    return data;
  })();

  const deleteLogger = async () => {
    const response = await fetch(uri + "/api/deleteLogger/" + $ApiKey + "/" + $Logger, {
      method: "DELETE",
    });

    const data = await response.json();

      if (response.status !== (200 || 300)) {
        console.error(data)
        return;
      }

      Logger.set("");
      LoggerReq.set(false);
      URLSended.set(false);
      window.location.reload();
  
}

</script>

{#await fetchLogger}
  <h3>Loading logger ...</h3>
{:then logger}

  <div class="grid grid-cols-1 mb-10">
    <div class="col-span-1">
      <div class="bg-gray-300 p-4">
        <h3 class="text-xl text-gray-700 mb-2">Logger {logger.Id}</h3>
        <p class="text-gray-600">
          <span class="font-bold">Shorted URL:</span> <a href={uri + "/" + logger.Id}>{uri + "/" + logger.Id}</a>
        </p>
        <p class="text-gray-600">
          <span class="font-bold">Clicks:</span> {logger.Clicks}
        </p>
        <p class="text-gray-600">
          <span class="font-bold">Visitors:</span> 
          {#if logger.Visitors}
          [{#each logger.Visitors as visitor , i} 
          {#if visitor.Ip != null}
          {visitor.Ip} 
          {:else}
          Uknown visitor
          {/if}
          at {visitor.Clicked}
          {#if i !== logger.Visitors.length - 1}
            <span> , </span>
          {/if}
          {/each}]
          {:else}
            No visitors
          {/if}
        </p>
        <p class="text-gray-600">
          <span class="font-bold">Url:</span> {logger.Url}
        </p>

        <p class="text-gray-600">
          <button class="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 rounded" on:click={deleteLogger}>Delete Logger</button>
        </div>
    </div>
  </div>

{:catch err}
  <p class="font-bold text-red-500">Error loading logger {$Logger} : {err}</p>
{/await}
