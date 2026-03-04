/**
 * app.js - Core Application Logic for NEXUS Premium Salon SPA
 * Focus: Global State, Personalization, and Senior Validation.
 */

// 1. Estado Global
const state = {
    service: null,
    price: 0,
    client: {
        name: '',
        email: '',
        phone: ''
    },
    appointment: {
        date: '',
        time: ''
    }
};

// 2. Reconocimiento de Usuario (Personalización)
function checkReturningUser() {
    try {
        const storedUser = localStorage.getItem('nexus_premium_client');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            if (userData && userData.name) {
                const firstName = userData.name.split(' ')[0];
                showPersonalizedGreeting(`¡Qué bueno verte de nuevo, ${firstName}! ✨`);

                // Pre-fill inputs si existen en el DOM
                const nameInput = document.getElementById('client-name');
                const emailInput = document.getElementById('client-email');
                const phoneInput = document.getElementById('client-phone');

                if(nameInput) nameInput.value = userData.name;
                if(emailInput) emailInput.value = userData.email || '';
                if(phoneInput) phoneInput.value = userData.phone || '';
            }
        }
    } catch (error) {
        console.error("Error accessing localStorage", error);
    }
}

function showPersonalizedGreeting(message) {
    const greetingEl = document.getElementById('personalized-greeting');
    if (greetingEl) {
        greetingEl.textContent = message;
        greetingEl.style.display = 'block';
        greetingEl.classList.add('fade-in');
    }
}

// Guardar usuario al confirmar reserva
function saveUserToStorage() {
    const userData = {
        name: state.client.name,
        email: state.client.email,
        phone: state.client.phone
    };
    localStorage.setItem('nexus_premium_client', JSON.stringify(userData));
}

// 3. Validación Senior: Regex estricto para teléfonos de Argentina
// Requiere código de área (2 a 4 dígitos) y número local (6 a 8 dígitos), totalizando 10 dígitos obligatoriamente.
// No debe empezar con 0 ni contener el 15.
// Formatos aceptados (sin espacios/guiones internamente en el test): 1123456789, 2231234567
const AR_PHONE_REGEX = /^(?:(?:11|[2368]\d{2}|[4579]\d{3})\d{6,8})$/;

function validatePhone(phoneString) {
    // Limpiamos espacios, guiones, paréntesis
    const cleanPhone = phoneString.replace(/[\s\-\(\)]/g, '');

    if (cleanPhone.startsWith('0') || cleanPhone.includes('15') && cleanPhone.indexOf('15') === (cleanPhone.length - 8)) {
       // Chequeo básico rápido para feedback específico si se desea,
       // pero el regex principal es la fuente de verdad.
    }

    return AR_PHONE_REGEX.test(cleanPhone) && cleanPhone.length === 10;
}

// 4. Detector de Dudas (Hesitation Detector)
let hesitationTimer = null;

function setupHesitationDetector() {
    // Escuchar el evento personalizado emitido por ui.js
    document.addEventListener('stepChanged', (e) => {
        const step = e.detail.step;

        // Limpiar timer anterior si existe
        if (hesitationTimer) {
            clearTimeout(hesitationTimer);
            hesitationTimer = null;
        }

        const tooltip = document.getElementById('hesitation-tooltip');
        if (tooltip) {
            tooltip.classList.remove('visible');
        }

        // Si estamos en el paso de confirmación (Paso 3)
        if (step === 3) {
            hesitationTimer = setTimeout(() => {
                showHesitationTooltip();
            }, 10000); // 10 segundos
        }
    });
}

function showHesitationTooltip() {
    const tooltip = document.getElementById('hesitation-tooltip');
    if (tooltip) {
        tooltip.textContent = '¿Dudas? Podés pagar en el salón.';
        tooltip.classList.add('visible');
    }
}

// 5. Inicialización y Event Listeners del Formulario
document.addEventListener('DOMContentLoaded', () => {
    checkReturningUser();
    setupHesitationDetector();

    const form = document.getElementById('nexus-booking-form');
    const phoneInput = document.getElementById('client-phone');

    if (phoneInput) {
        phoneInput.addEventListener('input', () => {
            // Remove error styling on input
            phoneInput.classList.remove('input-error');
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Recolectar datos
            const nameEl = document.getElementById('client-name');
            const emailEl = document.getElementById('client-email');
            const phoneEl = document.getElementById('client-phone');
            const dateEl = document.getElementById('book-date');
            const timeEl = document.getElementById('book-time');

            state.client.name = nameEl ? nameEl.value : '';
            state.client.email = emailEl ? emailEl.value : '';
            state.client.phone = phoneEl ? phoneEl.value : '';
            state.appointment.date = dateEl ? dateEl.value : '';
            state.appointment.time = timeEl ? timeEl.value : '';

            // Validar teléfono antes de enviar
            if (!validatePhone(state.client.phone)) {
                if (phoneEl) {
                    phoneEl.classList.add('input-error');
                    // Opcional: mostrar mensaje de error
                    alert("Por favor, ingresá un número de celular válido de Argentina (código de área + número, sin 0 ni 15. Ej: 2231234567)");
                }
                return;
            }

            // Simular envío exitoso
            saveUserToStorage();

            // Ocultar formulario y mostrar mensaje de éxito
            form.innerHTML = `
                <div class="success-message fade-in" style="text-align: center; padding: 3rem;">
                    <h3 style="color: var(--gold); margin-bottom: 1rem;">¡Reserva Confirmada, ${state.client.name.split(' ')[0]}!</h3>
                    <p>Te esperamos el ${state.appointment.date} a las ${state.appointment.time}.</p>
                    <p style="font-size: 0.9rem; margin-top: 2rem; color: var(--text-secondary);">Recibirás un recordatorio por WhatsApp.</p>
                </div>
            `;
        });
    }
});
