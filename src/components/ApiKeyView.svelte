<script>
  import { ApiKey, uri } from "./../stores/stores.js";

  let key,
    mail,
    message = "";

  if ($ApiKey) key = $ApiKey;

  const setApiKey = () => {
    ApiKey.set(key);
  };

  const sendMail = () => {
    let formData = new FormData();

    formData.append("email", mail);

    fetch(`${uri}/api/getApiKey`, {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((res) => {
        mail = "";
        message = res.message;
      })
      .catch((err) => {
        alert(err);
      });
  };
</script>

<label for="apiKey" class="font-bold"> Set your API Key </label>
<div class="flex flox-row">
  <input
    name="apiKey"
    bind:value={key}
    class="px-1 bg-gray-300 min-w-full"
    placeholder="Enter your API Key"
  />

  <button
    class="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 ml-1 px-4 rounded"
    on:click={setApiKey}>Submit</button
  >
</div>

<hr class="my-4" />

<box>
  <p class="font-bold text-red-500">{message}</p>
</box>

<label for="mail" class="font-bold">Get Key</label>
<div class="flex flex-row align-middle">
  <input
    name="mail"
    bind:value={mail}
    class="px-1 bg-gray-300"
    placeholder="Enter your email"
  />

  <button
    on:click={sendMail}
    class="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 ml-1 px-4 rounded"
  >
    Send ApiKey
  </button>
</div>
