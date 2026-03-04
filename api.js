/**
 * api.js - Data Management & API Module for NEXUS Premium Salon
 * Focus: Offline-First, Sanitization, Make.com Integration.
 */

const MAKE_WEBHOOK_URL = 'https://hook.us1.make.com/tu_webhook_id_aqui'; // Reemplazar con URL real
const PENDING_BOOKING_KEY = 'nexus_pending_booking';

const api = {
    /**
     * Sanitiza los datos del payload antes de enviarlos.
     * @param {Object} payload - Objeto con los datos de la reserva
     * @returns {Object} Payload sanitizado
     */
    sanitizeData: (payload) => {
        const cleanPayload = JSON.parse(JSON.stringify(payload)); // Deep copy simple

        if (cleanPayload.client) {
            // Capitalizar primera letra de cada palabra en el nombre
            if (cleanPayload.client.name) {
                cleanPayload.client.name = cleanPayload.client.name
                    .toLowerCase()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')
                    .trim();
            }

            // Normalizar teléfono (quitar todo lo que no sea dígito)
            if (cleanPayload.client.phone) {
                cleanPayload.client.phone = cleanPayload.client.phone.replace(/\D/g, '');
            }

            // Email a minúsculas y sin espacios
            if (cleanPayload.client.email) {
                cleanPayload.client.email = cleanPayload.client.email.toLowerCase().trim();
            }
        }

        return cleanPayload;
    },

    /**
     * Envía la reserva al webhook. Implementa estrategia Offline-First.
     * @param {Object} rawPayload - Datos crudos del estado global
     * @returns {Promise<boolean>} Promesa que indica si el envío final fue exitoso (o si quedó pendiente).
     */
    sendBooking: async (rawPayload) => {
        const payload = api.sanitizeData(rawPayload);

        // Si no hay conexión de antemano, lo guardamos directamente
        if (!navigator.onLine) {
            console.warn('Usuario offline. Guardando reserva localmente.');
            api.savePendingBooking(payload);
            return false; // Indica que se guardó offline
        }

        try {
            const response = await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log('Reserva enviada exitosamente a Make.com');
            // Si había una reserva pendiente y acabamos de enviar una nueva con éxito,
            // asumimos que el estado actual está limpio, pero por seguridad limpiamos.
            localStorage.removeItem(PENDING_BOOKING_KEY);
            return true;

        } catch (error) {
            console.error('Error enviando la reserva:', error);
            console.warn('Guardando reserva localmente para reintento.');
            api.savePendingBooking(payload);
            return false; // Falló el fetch, se guardó offline
        }
    },

    /**
     * Guarda la reserva en localStorage
     */
    savePendingBooking: (payload) => {
        try {
            localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify({
                data: payload,
                timestamp: new Date().toISOString()
            }));

            // Dispatch a custom event in case the UI wants to show an "Offline mode" indicator
            document.dispatchEvent(new CustomEvent('bookingSavedOffline'));
        } catch (e) {
            console.error('No se pudo guardar la reserva en localStorage', e);
        }
    },

    /**
     * Intenta enviar cualquier reserva pendiente guardada
     */
    retryPendingBooking: async () => {
        const pendingStr = localStorage.getItem(PENDING_BOOKING_KEY);
        if (!pendingStr) return;

        try {
            const pending = JSON.parse(pendingStr);
            console.log('Intentando enviar reserva pendiente de la sesión anterior...', pending.timestamp);

            // Reutilizamos la lógica del fetch crudo para no hacer bucles infinitos con sendBooking
            const response = await fetch(MAKE_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(pending.data) // Ya fue sanitizada al guardarse
            });

            if (response.ok) {
                console.log('Reserva pendiente enviada exitosamente. Limpiando caché offline.');
                localStorage.removeItem(PENDING_BOOKING_KEY);
                document.dispatchEvent(new CustomEvent('pendingBookingSent'));
            } else {
                console.warn('Reintento falló. Se mantendrá guardada.');
            }
        } catch (error) {
            console.error('Error procesando reserva pendiente al volver online:', error);
        }
    }
};

// Escuchar evento de reconexión de red
window.addEventListener('online', () => {
    console.log('Conexión restablecida. Comprobando reservas pendientes...');
    api.retryPendingBooking();
});

// Comprobar si hay reservas pendientes al cargar la página (por si cerró la pestaña estando offline)
document.addEventListener('DOMContentLoaded', () => {
    if (navigator.onLine) {
        api.retryPendingBooking();
    }
});

// Exponer en window para el resto de la app
window.api = api;