<script>
	import { ApiKeyRequest , URLSended } from './../stores/stores.js';

  const handleApiKey = () => {
    ApiKeyRequest.update((bool) => !bool)
    if ($URLSended) URLSended.set(false)
  };

</script>

<footer class="bg-gray-300 text-md font-bold text-center">
  <a href="https://github.com/piterweb" class="hover:no-underline" target="_blank">PiterDev</a>

  <button
    on:click={handleApiKey}
    class="border-0 text-blue-700 hover:text-blue-600 underline bg-transparent">Get / Set ApiKey</button
  >
</footer>
