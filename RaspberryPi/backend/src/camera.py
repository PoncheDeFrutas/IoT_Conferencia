import os
import threading
import time

import cv2

CAMERA_DEVICE = int(os.getenv("CAMERA_DEVICE", "0"))
CAMERA_WIDTH = int(os.getenv("CAMERA_WIDTH", "640"))
CAMERA_HEIGHT = int(os.getenv("CAMERA_HEIGHT", "480"))
CAMERA_FPS = int(os.getenv("CAMERA_FPS", "15"))
CAMERA_JPEG_QUALITY = int(os.getenv("CAMERA_JPEG_QUALITY", "70"))


class CameraStream:
    def __init__(self):
        self.camera = None
        self.running = False

        self.jpeg = None

        self.frame_id = 0

        self.condition = threading.Condition()
        self.start_lock = threading.Lock()

        self.thread = None
        self.error = None

    def start(self):
        with self.start_lock:
            if self.running:
                return

            print("Opening camera...")

            camera = cv2.VideoCapture(
                CAMERA_DEVICE,
                cv2.CAP_V4L2,
            )

            if not camera.isOpened():
                camera.release()
                raise RuntimeError(f"No se pudo abrir /dev/video{CAMERA_DEVICE}")

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

            camera.set(
                cv2.CAP_PROP_BUFFERSIZE,
                1,
            )

            self.camera = camera
            self.running = True
            self.error = None

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

            self.thread = threading.Thread(
                target=self._capture_loop,
                daemon=True,
            )

            self.thread.start()

    def _capture_loop(self):
        failed_reads = 0

        try:
            while self.running:
                success, frame = self.camera.read()

                if not success:
                    failed_reads += 1

                    print(f"No se pudo obtener frame ({failed_reads}/20)")

                    if failed_reads >= 20:
                        self.error = "Se perdió la señal de la cámara"
                        break

                    time.sleep(0.1)
                    continue

                failed_reads = 0

                success, buffer = cv2.imencode(
                    ".jpg",
                    frame,
                    [
                        cv2.IMWRITE_JPEG_QUALITY,
                        CAMERA_JPEG_QUALITY,
                    ],
                )

                if not success:
                    continue

                jpeg = buffer.tobytes()

                with self.condition:
                    self.jpeg = jpeg
                    self.frame_id += 1

                    self.condition.notify_all()

        except Exception as error:
            self.error = str(error)
            print(f"Camera error: {error}")

        finally:
            self.running = False

            if self.camera is not None:
                self.camera.release()
                self.camera = None

            with self.condition:
                self.condition.notify_all()

            print("Camera released")

    def generate_frames(self):
        self.start()

        last_frame_id = -1

        while True:
            with self.condition:
                self.condition.wait_for(
                    lambda: self.frame_id != last_frame_id or not self.running,
                    timeout=5,
                )

                if not self.running:
                    break

                if self.jpeg is None:
                    continue

                jpeg = self.jpeg
                last_frame_id = self.frame_id

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n"
                b"Content-Length: " + str(len(jpeg)).encode() + b"\r\n"
                b"\r\n" + jpeg + b"\r\n"
            )

    def get_snapshot(self):
        self.start()

        with self.condition:
            ready = self.condition.wait_for(
                lambda: self.jpeg is not None or not self.running,
                timeout=5,
            )

            if not ready or self.jpeg is None:
                raise RuntimeError(
                    self.error or "No se pudo obtener una imagen de la cámara"
                )

            return self.jpeg

    def stop(self):
        self.running = False

        with self.condition:
            self.condition.notify_all()

        if self.thread is not None:
            self.thread.join(timeout=2)

        if self.camera is not None:
            self.camera.release()
            self.camera = None

        print("Camera stopped")


camera_stream = CameraStream()
