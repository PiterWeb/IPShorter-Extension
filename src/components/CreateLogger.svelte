<script>
	import { ApiKey ,  URLSended , uri , LoggerReq , Logger } from './../stores/stores.js';

  let err = '';

  let originalURL = "";

  const sendURL = () => {

    URLSended.set(false);
    LoggerReq.set(false);

    if (!$ApiKey) err = "Api Key is not set";

    let formData = new FormData();

    formData.append('url', originalURL);

    fetch(`${uri}/api/createLogger/`+ $ApiKey, {
      method: 'POST',
      body: formData
    })
      .then((res) => res.json())
      .then(({ Id }) => {
        URLSended.set(true);
        LoggerReq.set(true);
        Logger.set(Id);
      })
      .catch(() => {
        err = "Error al obtener las URLs";
      });

      originalURL = "";

  };

</script>

<label for="t-url" class="font-bold">Target URL</label>
  <div class="flex flex-row">
    <input
    name="t-url"
    bind:value={originalURL}
    class="px-1 bg-gray-300"
    placeholder="https://example.com"
    />
  
    <button
    class="bg-blue-500 hover:bg-blue-400 text-white font-bold ml-1 py-2 px-4 rounded-r"
    on:click={sendURL}>Submit</button
    >
  </div>


  
  <box>
    <p class="font-bold text-red-500">{err}</p>
  </box>
  
  