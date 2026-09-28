# Panel IoT para conferencia

La vista **Monitoreo** muestra temperatura del DHT11 de Raspberry Pi, humedad, temperatura interna del ESP32 y señal Wi‑Fi. La vista **Control ESP32** permite enviar ON y OFF al LED, escribir en la OLED y observar el dispositivo con la cámara conectada a Raspberry Pi. Se cambia de vista con las pestañas de la cabecera; `#monitor` y `#control` son enlaces directos. Las lecturas y comandos usan MQTT. Al abrir, se cargan hasta 100 temperaturas anteriores desde Flask.

## Preparación

Desde Frontend/:

    pnpm install
    cp .env.example .env
    pnpm dev

Edita .env si cambia el dominio de ngrok. VITE_API_BASE_URL debe contener solo el origen HTTPS; el frontend añade /api/temperature/latest?limit=100 y /camera. Las variables VITE_* son visibles en el navegador: no pongas credenciales en ellas.

## Servicios durante la demostración

1. Ejecuta RaspberryPi/iot con sus variables de MongoDB y el DHT11 conectado. Publica en ARQUI1B_2026/telemetry.
2. Conecta la cámara USB a Raspberry Pi y ejecuta Flask desde RaspberryPi/backend con uv run python src/main.py. Debe responder {"status":"ok"} en http://127.0.0.1:5000/ y entregar MJPEG en /camera. Si la cámara usa otro dispositivo, ajusta CAMERA_DEVICE en RaspberryPi/backend/src/.env.
3. En la misma Raspberry Pi, abre el túnel con ngrok http 5000. Copia su URL HTTPS a Frontend/.env y reinicia Vite.
4. Vuelve a compilar y cargar el firmware de ESP32 con PlatformIO; después conéctalo a Wi‑Fi. Publica en ARQUI1B_2026/telemetry y recibe órdenes y texto en ARQUI1B_2026/commands.

El navegador se conecta por wss://broker.emqx.io:8084/mqtt. La API y /camera permiten CORS. El frontend solicita la transmisión MJPEG con `fetch` y el encabezado `ngrok-skip-browser-warning: true`, necesario para mostrarla desde un sitio estático publicado. Si el túnel o la cámara están apagados, la vista de control permite reintentar; las lecturas MQTT siguen funcionando.

Mantén el reloj de Raspberry Pi sincronizado: el historial usa sus timestamps Unix y las gráficas comparan esas horas con la del navegador.

El formulario admite hasta 40 caracteres ASCII imprimibles. El firmware conserva mayúsculas y minúsculas en la OLED; ON y OFF también funcionan si se escriben en el campo de texto.

## Comprobación

    pnpm test
    pnpm lint
    pnpm build

En el navegador, comprueba las lecturas y gráficas en Monitoreo. Abre Control ESP32 y verifica que la cámara muestra el dispositivo, que el LED responde a ON y OFF y que el texto llega a la OLED. dist/ contiene la versión estática para servir por HTTPS.

VITE_API_BASE_URL se incorpora al compilar. Si cambia el dominio ngrok de una versión estática, actualiza .env y vuelve a ejecutar pnpm build.
