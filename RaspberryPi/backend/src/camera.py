import os
import time

import cv2

CAMERA_DEVICE = int(os.getenv("CAMERA_DEVICE", "0"))
CAMERA_WIDTH = int(os.getenv("CAMERA_WIDTH", "640"))
CAMERA_HEIGHT = int(os.getenv("CAMERA_HEIGHT", "480"))
CAMERA_FPS = int(os.getenv("CAMERA_FPS", "15"))


def open_camera():
    camera = cv2.VideoCapture(
        CAMERA_DEVICE,
        cv2.CAP_V4L2,
    )

    if not camera.isOpened():
        camera.release()
        raise RuntimeError(f"No se pudo abrir /dev/video{CAMERA_DEVICE}")

    # Tu Logitech C270 soporta MJPG.
    # Es mucho más eficiente que YUYV para la Raspberry.
    camera.set(
        cv2.CAP_PROP_FOURCC,
        cv2.VideoWriter_fourcc(*"MJPG"),
    )

    camera.set(
        cv2.CAP_PROP_FRAME_WIDTH,
        CAMERA_WIDTH,
    )

    camera.set(
        cv2.CAP_PROP_FRAME_HEIGHT,
        CAMERA_HEIGHT,
    )

    camera.set(
        cv2.CAP_PROP_FPS,
        CAMERA_FPS,
    )

    # Reduce retraso acumulado
    camera.set(
        cv2.CAP_PROP_BUFFERSIZE,
        1,
    )

    print("=== CAMERA ===")
    print(f"Device: /dev/video{CAMERA_DEVICE}")
    print(f"Opened: {camera.isOpened()}")
    print(
        "Resolution:",
        camera.get(cv2.CAP_PROP_FRAME_WIDTH),
        "x",
        camera.get(cv2.CAP_PROP_FRAME_HEIGHT),
    )
    print(
        "FPS:",
        camera.get(cv2.CAP_PROP_FPS),
    )

    return camera


def generate_frames(camera):
    failed_reads = 0
    try:
        while True:
            success, frame = camera.read()

            if not success:
                failed_reads += 1
                if failed_reads >= 20:
                    raise RuntimeError("Se perdió la señal de la cámara")
                print("No se pudo obtener un frame de la cámara")
                time.sleep(0.1)
                continue
            failed_reads = 0

            success, buffer = cv2.imencode(
                ".jpg",
                frame,
                [
                    cv2.IMWRITE_JPEG_QUALITY,
                    70,
                ],
            )

            if not success:
                continue

            jpeg = buffer.tobytes()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n"
                b"Content-Length: " + str(len(jpeg)).encode() + b"\r\n"
                b"\r\n" + jpeg + b"\r\n"
            )

    finally:
        camera.release()
        print("Camera released")
