/* ============================================================
   storage.js — wrapper seguro sobre localStorage
   Isola o acesso ao localStorage para:
   1. falhar silenciosamente em modo privado (onde está bloqueado)
   2. fazer JSON parse/stringify automaticamente
   3. centralizar num sítio se um dia migrarmos para API
   ============================================================ */

window.Storage = (function () {
    'use strict';

    function get(key, defaultValue) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? (defaultValue || null) : JSON.parse(raw);
        } catch (e) {
            return defaultValue || null;
        }
    }

    function set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }

    function remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            return false;
        }
    }

    return { get: get, set: set, remove: remove };
})();