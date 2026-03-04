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
    },
    tracking: {
        startTime: Date.now(),
        timeToConvert: 0,
        trafficSource: ''
    }
};

// 1.5 Business Tracking Setup
function setupBusinessTracking() {
    // Detectar fuente de tráfico (Referrer o UTM)
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source');

    if (utmSource) {
        state.tracking.trafficSource = `UTM: ${utmSource}`;
    } else if (document.referrer) {
        state.tracking.trafficSource = `Referrer: ${new URL(document.referrer).hostname}`;
    } else {
        state.tracking.trafficSource = 'Direct / Bookmark';
    }
}

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
    setupBusinessTracking();

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

            // Calcular Tiempo de Conversión (en segundos)
            state.tracking.timeToConvert = Math.round((Date.now() - state.tracking.startTime) / 1000);

            // Validar teléfono antes de enviar
            if (!validatePhone(state.client.phone)) {
                if (phoneEl) {
                    phoneEl.classList.add('input-error');
                    // Opcional: mostrar mensaje de error
                    alert("Por favor, ingresá un número de celular válido de Argentina (código de área + número, sin 0 ni 15. Ej: 2231234567)");
                }
                return;
            }

            // Deshabilitar botón temporalmente para prevenir doble envío
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Procesando...';
            }

            // Realizar el envío de forma asíncrona usando la lógica Offline-First del módulo API
            window.api.sendBooking(state).then(success => {
                // Guardar localmente para personalización futura
                saveUserToStorage();

                // Create elements safely to avoid Self-XSS
                const successDiv = document.createElement('div');
                successDiv.className = 'success-message fade-in';
                successDiv.style.cssText = 'text-align: center; padding: 3rem;';

                const h3 = document.createElement('h3');
                h3.style.cssText = 'color: var(--gold); margin-bottom: 1rem;';
                h3.textContent = `¡Reserva Confirmada, ${state.client.name.split(' ')[0]}!`;

                const pDate = document.createElement('p');
                pDate.textContent = `Te esperamos el ${state.appointment.date} a las ${state.appointment.time}.`;

                const pReminder = document.createElement('p');
                pReminder.style.cssText = 'font-size: 0.9rem; margin-top: 2rem; color: var(--text-secondary);';
                pReminder.textContent = 'Recibirás un recordatorio por WhatsApp.';

                successDiv.appendChild(h3);
                successDiv.appendChild(pDate);

                if (!navigator.onLine) {
                    const pOffline = document.createElement('p');
                    pOffline.style.cssText = 'color: var(--gold); font-size: 0.85rem; margin-top: 1rem;';
                    pOffline.textContent = 'Estás sin conexión. Tu reserva se enviará automáticamente cuando recuperes la señal.';
                    successDiv.appendChild(pOffline);
                }

                successDiv.appendChild(pReminder);

                // Clear form and append success message
                form.innerHTML = '';
                form.appendChild(successDiv);
            }).catch(error => {
                console.error("Error inesperado procesando la reserva en la UI:", error);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Confirmar Reserva';
                }
                alert('Ocurrió un error procesando tu reserva. Por favor intenta de nuevo.');
            });
        });
    }
});
