import { writable } from 'svelte/store';

export const uri = 'https://ipshorter.herokuapp.com'

export const URLSended = writable(false);

export const IPLoggerURL = writable("");

export const IPLoggers = writable([]);

export const ApiKey = writable((localStorage.getItem("apiKey")) ? localStorage.getItem("apiKey") : "");

export const ApiKeyRequest = writable(false);

export const LoggerReq = writable(false);

export const Logger = writable("");

ApiKey.subscribe(value => {
    if (value) {
        localStorage.setItem("apiKey", value);
    }
})
