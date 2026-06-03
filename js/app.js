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
const btnArdilla = document.getElementById("btnArdilla");
const audioEfecto = document.getElementById("audioEfecto");
const btnAnciano = document.getElementById("btnAnciano");
const btnCompartir = document.getElementById("btnCompartir");
const btnRobot = document.getElementById("btnRobot");

let audioBlobActual = null;
let audioProcesadoActual = null;

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
            audioBlobActual = new Blob(audioChunks, { type: "audio/webm" });
            const audioUrl = URL.createObjectURL(audioBlobActual);

            audioOriginal.src = audioUrl;
            btnArdilla.disabled = false;
            btnAnciano.disabled = false;
            btnRobot.disabled = false;

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
    audioEfecto.src = "";
    audioChunks = [];
    audioBlobActual = null;
    audioProcesadoActual = null;
    

    estado.textContent = "Audio borrado. Listo para grabar otro.";
    btnBorrar.disabled = true;
    btnArdilla.disabled = true;
    btnAnciano.disabled = true;
    btnRobot.disabled = true;
    btnCompartir.disabled = true;
});

// =========================
// EFECTO ARDILLA
// =========================

btnArdilla.addEventListener("click", async () => {
    if (!audioBlobActual) {
        estado.textContent = "Primero grabá un audio.";
        return;
    }

    estado.textContent = "Aplicando efecto ardilla...";

    try {
        const arrayBuffer = await audioBlobActual.arrayBuffer();

        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length / 1.48,
            audioBuffer.sampleRate
        );

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;

        // Sube el tono sin acelerar demasiado el audio.
        source.playbackRate.value = 1.48;

        // Filtro para dar brillo al efecto.
        const filter = offlineContext.createBiquadFilter();
        filter.type = "highshelf";
        filter.frequency.value = 3200;
        filter.gain.value = 12;

        source.connect(filter);
        filter.connect(offlineContext.destination);

        source.start(0);

        const renderedBuffer = await offlineContext.startRendering();
        const wavBlob = audioBufferToWav(renderedBuffer);
        audioProcesadoActual = wavBlob;
        btnCompartir.disabled = false;
        const audioUrl = URL.createObjectURL(wavBlob);

        audioEfecto.src = audioUrl;
        estado.textContent = "Efecto ardilla listo.";
    } catch (error) {
        console.error(error);
        estado.textContent = "No se pudo aplicar el efecto.";
    }
});

// =========================
// CONVERTIR AUDIO BUFFER A WAV
// =========================

function audioBufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels = [];
    let offset = 0;
    let pos = 0;

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);

    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);

    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (let i = 0; i < numOfChan; i++) {
            let sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([bufferArray], { type: "audio/wav" });

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

function crearDistorsionRobot(cantidad) {
    const muestras = 44100;
    const curva = new Float32Array(muestras);
    const deg = Math.PI / 180;

    for (let i = 0; i < muestras; i++) {
        const x = (i * 2) / muestras - 1;
        curva[i] = ((3 + cantidad) * x * 20 * deg) / (Math.PI + cantidad * Math.abs(x));
    }

    return curva;
}

// ============================================================================
// EFECTO ANCIANO
// ============================================================================

btnAnciano.addEventListener("click", async () => {
    if (!audioBlobActual) {
        estado.textContent = "Primero grabá un audio.";
        return;
    }

    estado.textContent = "Aplicando efecto anciano...";


    try {
        const arrayBuffer = await audioBlobActual.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const pitchRate = 0.78;

        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length / pitchRate,
            audioBuffer.sampleRate
        );

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;

        // Baja el tono y la velocidad para lograr una voz de hombre mayor.
        source.playbackRate.value = pitchRate;

        // Apaga el brillo para que la voz se sienta mas envejecida.
        const lowpass = offlineContext.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 2100;

        // Refuerza cuerpo en graves medios para que suene mas masculino.
        const body = offlineContext.createBiquadFilter();
        body.type = "lowshelf";
        body.frequency.value = 420;
        body.gain.value = 5;

        // Agrega una zona ronca suave, sin saturar el audio.
        const roughness = offlineContext.createBiquadFilter();
        roughness.type = "peaking";
        roughness.frequency.value = 720;
        roughness.Q.value = 0.8;
        roughness.gain.value = 2.5;

        // Vibrato suave para evitar una sensacion de eco o doble voz.
        const vibrato = offlineContext.createOscillator();
        vibrato.frequency.value = 3.4;

        const vibratoDepth = offlineContext.createGain();
        vibratoDepth.gain.value = 8;

        vibrato.connect(vibratoDepth);
        vibratoDepth.connect(source.detune);

        // Temblor de volumen leve, sin eco ni doble voz.
        const tremolo = offlineContext.createGain();
        tremolo.gain.value = 0.92;

        const oscillator = offlineContext.createOscillator();
        oscillator.frequency.value = 2.6;

        const tremoloDepth = offlineContext.createGain();
        tremoloDepth.gain.value = 0.002;

        oscillator.connect(tremoloDepth);
        tremoloDepth.connect(tremolo.gain);

        source.connect(body);
        body.connect(lowpass);
        lowpass.connect(roughness);
        roughness.connect(tremolo);
        tremolo.connect(offlineContext.destination);

        vibrato.start(0);
        oscillator.start(0);
        source.start(0);

        const renderedBuffer = await offlineContext.startRendering();
        const wavBlob = audioBufferToWav(renderedBuffer);
        audioProcesadoActual = wavBlob;
        btnCompartir.disabled = false;

        audioEfecto.src = URL.createObjectURL(wavBlob);
        estado.textContent = "Efecto anciano listo.";
    } catch (error) {
        console.error(error);
        estado.textContent = "No se pudo aplicar el efecto.";
    }
});

// ============================================================================
// COMPARTIR AUDIO
// ============================================================================

btnCompartir.addEventListener("click", async () => {

    if (!audioProcesadoActual) {
        estado.textContent = "No hay audio para compartir.";
        return;
    }

    try {

        const archivo = new File(
            [audioProcesadoActual],
            "voz-loca.wav",
            { type: "audio/wav" }
        );

        if (navigator.canShare && navigator.canShare({ files: [archivo] })) {

            await navigator.share({
                title: "Voz Loca",
                text: "Escuchá este audio creado con Voz Loca",
                files: [archivo]
            });

        } else {

            estado.textContent =
                "Tu navegador no permite compartir archivos.";

        }

    } catch (error) {

        console.error(error);

    }

});

// ============================================================================
// EFECTO ROBOT
// ============================================================================

btnRobot.addEventListener("click", async () => {
    if (!audioBlobActual) {
        estado.textContent = "Primero grabá un audio.";
        return;
    }

    estado.textContent = "Aplicando efecto robot...";

    try {
        const arrayBuffer = await audioBlobActual.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;

        const highpass = offlineContext.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 220;

        const waveShaper = offlineContext.createWaveShaper();
        waveShaper.curve = crearDistorsionRobot(85);
        waveShaper.oversample = "4x";

        const bandpass = offlineContext.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.value = 1150;
        bandpass.Q.value = 3.8;

        const metalico = offlineContext.createBiquadFilter();
        metalico.type = "peaking";
        metalico.frequency.value = 1750;
        metalico.Q.value = 6;
        metalico.gain.value = 11;

        const recorteAgudos = offlineContext.createBiquadFilter();
        recorteAgudos.type = "lowpass";
        recorteAgudos.frequency.value = 3600;

        const moduladorRobot = offlineContext.createOscillator();
        moduladorRobot.type = "square";
        moduladorRobot.frequency.value = 46;

        const profundidadRobot = offlineContext.createGain();
        profundidadRobot.gain.value = 0.34;

        const volumenRobot = offlineContext.createGain();
        volumenRobot.gain.value = 0.44;

        const delayMetalico = offlineContext.createDelay();
        delayMetalico.delayTime.value = 0.026;

        const feedbackMetalico = offlineContext.createGain();
        feedbackMetalico.gain.value = 0.28;

        const compresor = offlineContext.createDynamicsCompressor();
        compresor.threshold.value = -18;
        compresor.knee.value = 8;
        compresor.ratio.value = 5;
        compresor.attack.value = 0.003;
        compresor.release.value = 0.16;

        source.connect(highpass);
        highpass.connect(waveShaper);
        waveShaper.connect(bandpass);
        bandpass.connect(metalico);
        metalico.connect(recorteAgudos);
        recorteAgudos.connect(volumenRobot);

        moduladorRobot.connect(profundidadRobot);
        profundidadRobot.connect(volumenRobot.gain);

        volumenRobot.connect(compresor);
        volumenRobot.connect(delayMetalico);
        delayMetalico.connect(feedbackMetalico);
        feedbackMetalico.connect(delayMetalico);
        delayMetalico.connect(compresor);
        compresor.connect(offlineContext.destination);

        moduladorRobot.start(0);
        source.start(0);

        const renderedBuffer = await offlineContext.startRendering();
        const wavBlob = audioBufferToWav(renderedBuffer);

        audioProcesadoActual = wavBlob;
        btnCompartir.disabled = false;

        audioEfecto.src = URL.createObjectURL(wavBlob);
        estado.textContent = "Efecto robot listo.";
    } catch (error) {
        console.error(error);
        estado.textContent = "No se pudo aplicar el efecto robot.";
    }
});

// ============================================================================
// Registro y actualizacion del Service Worker
// ============================================================================

function mostrarAvisoDeActualizacion(worker) {
    const updateNotice = document.getElementById("updateNotice");
    const btnActualizarApp = document.getElementById("btnActualizarApp");

    if (!updateNotice || !btnActualizarApp) {
        return;
    }

    updateNotice.hidden = false;

    btnActualizarApp.onclick = () => {
        worker.postMessage({ type: "SKIP_WAITING" });
    };
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then((registration) => {
                console.log("Service Worker registrado");

                if (registration.waiting) {
                    mostrarAvisoDeActualizacion(registration.waiting);
                }

                registration.addEventListener("updatefound", () => {
                    const newWorker = registration.installing;

                    if (!newWorker) {
                        return;
                    }

                    newWorker.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            mostrarAvisoDeActualizacion(newWorker);
                        }
                    });
                });

                registration.update();
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000);
            })
            .catch((error) => {
                console.error("Error al registrar SW:", error);
            });
    });

    let actualizacionAplicada = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (actualizacionAplicada) {
            return;
        }

        actualizacionAplicada = true;
        window.location.reload();
    });
}
