/**
 * ui.js - Frontend UI module for NEXUS Premium Salon SPA
 * Focus: Visual Conversion, SEO, and Micro-interactions.
 */

// Configuración de servicios para SEO dinámico y precios
const serviceConfig = {
    color: {
        title: "Colorimetría Avanzada | NEXUS Mar del Plata",
        description: "Transforma tu estilo con nuestros expertos en color. Especialistas en balayage y tinturas premium en Mar del Plata.",
        price: 45000
    },
    corte: {
        title: "Diseño de Corte Exclusivo | NEXUS Mar del Plata",
        description: "Encuentra el corte perfecto que resalte tus facciones. Asesoramiento de imagen personalizado en nuestro salón de lujo.",
        price: 15000
    },
    tratamiento: {
        title: "Tratamientos Capilares Premium | NEXUS Mar del Plata",
        description: "Restaura la salud y el brillo de tu cabello con nuestra tecnología capilar avanzada.",
        price: 25000
    }
};

let currentService = null;

/**
 * 1. renderStep(step)
 * Cambia los pasos con transiciones suaves y actualiza la barra de progreso.
 */
function renderStep(stepNumber) {
    const steps = [1, 2, 3];

    steps.forEach(num => {
        const stepContainer = document.getElementById(`step-${num}`);
        if (!stepContainer) return;

        if (num === stepNumber) {
            stepContainer.style.display = 'block';
            // Force reflow for animation
            stepContainer.offsetHeight;
            stepContainer.classList.add('active');

            // Re-trigger fade in
            stepContainer.style.animation = 'none';
            stepContainer.offsetHeight;
            stepContainer.style.animation = null;
        } else {
            stepContainer.classList.remove('active');
            setTimeout(() => {
                // Wait for potential out animations before hiding completely,
                // though currently we rely on CSS display logic + opacity
                if (!stepContainer.classList.contains('active')) {
                    stepContainer.style.display = 'none';
                }
            }, 300); // match typical transition time
        }
    });

    updateProgressBar(stepNumber);

    // Si llegamos al paso 3, disparamos el efecto de Upselling
    if (stepNumber === 3 && currentService && serviceConfig[currentService]) {
        animatePrice('final-price', serviceConfig[currentService].price);
    }
}

function updateProgressBar(step) {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        // Asume 3 pasos: Paso 1 = 33%, Paso 2 = 66%, Paso 3 = 100%
        const percentage = (step / 3) * 100;
        progressBar.style.width = `${percentage}%`;
    }
}

/**
 * 2. injectDynamicSEO(servicio)
 * Cambia el <title> y los meta-tags según el servicio.
 */
function injectDynamicSEO(servicioId) {
    const config = serviceConfig[servicioId];
    if (!config) return;

    currentService = servicioId;

    // Update Title
    document.title = config.title;

    // Helper para actualizar meta tags
    const updateMeta = (nameAttr, nameValue, content) => {
        let meta = document.querySelector(`meta[${nameAttr}="${nameValue}"]`);
        if (meta) {
            meta.setAttribute('content', content);
        } else {
            // Si no existe, lo creamos preventivamente
            meta = document.createElement('meta');
            meta.setAttribute(nameAttr, nameValue);
            meta.setAttribute('content', content);
            document.head.appendChild(meta);
        }
    };

    // Update Standard Meta
    updateMeta('name', 'description', config.description);

    // Update Open Graph
    updateMeta('property', 'og:title', config.title);
    updateMeta('property', 'og:description', config.description);

    // Update Twitter Cards
    updateMeta('name', 'twitter:title', config.title);
    updateMeta('name', 'twitter:description', config.description);

    console.log(`SEO dinámico inyectado para: ${servicioId}`);
}

/**
 * 3. injectJSONLD()
 * Inserta dinámicamente el script JSON-LD (Schema.org) tipo BeautySalon.
 */
function injectJSONLD() {
    const jsonLdData = {
        "@context": "https://schema.org",
        "@type": "BeautySalon",
        "name": "NEXUS Salón Premium",
        "image": "https://www.nexus-salon.com.ar/assets/og-image.jpg",
        "url": "https://www.nexus-salon.com.ar",
        "telephone": "+54-223-123-4567",
        "priceRange": "$$$",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Güemes 3000", // Example address
            "addressLocality": "Mar del Plata",
            "addressRegion": "Buenos Aires",
            "postalCode": "7600",
            "addressCountry": "AR"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": -38.0004,
            "longitude": -57.5562
        },
        "openingHoursSpecification": [
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                "opens": "09:00",
                "closes": "20:00"
            }
        ]
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLdData, null, 2);
    document.head.appendChild(script);

    console.log('JSON-LD Schema.org inyectado');
}

/**
 * 4. Efecto Upselling (Contador Animado)
 * Implementa un contador animado para el precio.
 */
function animatePrice(elementId, targetPrice) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const duration = 1500; // ms
    const frameRate = 1000 / 60; // 60fps
    const totalFrames = Math.round(duration / frameRate);

    let currentFrame = 0;

    // Easing out function (curva para que frene suave al final)
    const easeOutQuad = t => t * (2 - t);

    const counter = setInterval(() => {
        currentFrame++;
        const progress = currentFrame / totalFrames;
        const easedProgress = easeOutQuad(progress);

        const currentPrice = Math.round(targetPrice * easedProgress);

        // Formatear precio en ARS
        el.textContent = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 0
        }).format(currentPrice);

        if (currentFrame === totalFrames) {
            clearInterval(counter);
        }
    }, frameRate);
}

// Inicialización global
document.addEventListener('DOMContentLoaded', () => {
    // Inyectar JSON-LD inicial
    injectJSONLD();

    // Iniciar con el paso 1
    renderStep(1);

    // Escuchar el selector de servicios
    const serviceSelector = document.getElementById('service-select');
    if (serviceSelector) {
        serviceSelector.addEventListener('change', (e) => {
            const servicio = e.target.value;
            if (servicio) {
                injectDynamicSEO(servicio);
            }
        });
    }
});

// Exponer funciones necesarias globalmente si es necesario (para onclicks)
window.renderStep = renderStep;
