// ============================================================================
// Estado de grabacion
// ============================================================================

let mediaRecorder;
let audioChunks = [];

// ============================================================================
// Referencias del DOM
// ============================================================================

const btnGrabar = document.getElementById("btnGrabar");
const btnDetener = document.getElementById("btnDetener");
const estado = document.getElementById("estado");
const audioOriginal = document.getElementById("audioOriginal");
const btnBorrar = document.getElementById("btnBorrar");

// ============================================================================
// Flujo de grabacion
// ============================================================================

btnGrabar.addEventListener("click", async () => {
    try {
        // Solicita acceso al microfono antes de iniciar la captura.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        // Inicia una nueva grabacion y actualiza el estado de los controles.
        mediaRecorder.start();

        estado.textContent = "Grabando...";
        btnGrabar.disabled = true;
        btnDetener.disabled = false;

        mediaRecorder.addEventListener("dataavailable", (event) => {
            // Guarda cada fragmento de audio generado por el navegador.
            audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", () => {
            // Construye un archivo reproducible a partir de los fragmentos capturados.
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            const audioUrl = URL.createObjectURL(audioBlob);

            audioOriginal.src = audioUrl;

            estado.textContent = "Grabación lista para reproducir";
            btnGrabar.disabled = false;
            btnDetener.disabled = true;
            btnBorrar.disabled = false;
        });

    } catch (error) {
        console.error(error);
        // Informa al usuario si el navegador bloquea o no permite el microfono.
        estado.textContent = "No se pudo acceder al micrófono";
    }
});

// Detiene la captura activa para disparar la preparacion del audio final.
btnDetener.addEventListener("click", () => {
    mediaRecorder.stop();
});

// Limpia la grabacion actual y deja la interfaz lista para un nuevo audio.
btnBorrar.addEventListener("click", () => {
    audioOriginal.src = "";
    audioChunks = [];

    estado.textContent = "Audio borrado. Listo para grabar otro.";
    btnBorrar.disabled = true;
});

// =========================
// REGISTRO DEL SERVICE WORKER
// =========================

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then(() => {
                console.log("Service Worker registrado");
            })
            .catch((error) => {
                console.error("Error al registrar SW:", error);
            });
    });
}
