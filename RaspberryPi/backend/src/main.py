import os

import cv2
from dotenv import load_dotenv
from flask import Flask, Response, request
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

load_dotenv()

from camera import generate_frames, open_camera

app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": "*"}, r"/camera": {"origins": "*"}})

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB")
MONGODB_COLLECTION = os.getenv("MONGODB_COLLECTION")

collection = None


def get_collection():
    global collection

    if collection is None:
        client = MongoClient(
            MONGODB_URI,
            server_api=ServerApi("1"),
        )

        collection = client[MONGODB_DB][MONGODB_COLLECTION]

    return collection


@app.route("/")
def index():
    return {
        "status": "ok",
        "service": "IoT Conference Backend",
    }


@app.route("/camera")
def camera():
    try:
        device = open_camera()
    except RuntimeError as error:
        return {"error": str(error)}, 503
    return Response(
        generate_frames(device),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-store"},
    )

@app.route("/camera/snapshot")
def camera_snapshot():
    camera = cv2.VideoCapture(
        0,
        cv2.CAP_V4L2,
    )

    camera.set(
        cv2.CAP_PROP_FOURCC,
        cv2.VideoWriter_fourcc(*"MJPG"),
    )

    camera.set(
        cv2.CAP_PROP_FRAME_WIDTH,
        640,
    )

    camera.set(
        cv2.CAP_PROP_FRAME_HEIGHT,
        480,
    )

    success, frame = camera.read()

    camera.release()

    if not success:
        return {
            "error": "No se pudo capturar la imagen"
        }, 500

    success, buffer = cv2.imencode(
        ".jpg",
        frame,
    )

    if not success:
        return {
            "error": "No se pudo codificar la imagen"
        }, 500

    return Response(
        buffer.tobytes(),
        mimetype="image/jpeg",
    )

@app.route("/api/temperature/latest")
def get_temperature():
    collection = get_collection()

    limit = request.args.get(
        "limit",
        default=20,
        type=int,
    )

    limit = max(1, min(limit, 100))

    data = list(
        collection.find(
            {
                "temperature": {
                    "$exists": True,
                    "$ne": None,
                }
            },
            {
                "_id": 0,
                "temperature": 1,
                "timestamp": 1,
            },
        )
        .sort("timestamp", -1)
        .limit(limit)
    )

    data.reverse()

    return {
        "count": len(data),
        "data": data,
    }


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        use_reloader=False,
        threaded=True,
    )
