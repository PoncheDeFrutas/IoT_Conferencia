import atexit
import os

from dotenv import load_dotenv
from flask import Flask, Response, request
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

from camera import camera_stream


load_dotenv()


app = Flask(__name__)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "*",
        },
        r"/camera*": {
            "origins": "*",
        },
    },
)


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
        return Response(
            camera_stream.generate_frames(),
            mimetype=(
                "multipart/x-mixed-replace; "
                "boundary=frame"
            ),
            headers={
                "Cache-Control": (
                    "no-store, no-cache, must-revalidate, "
                    "max-age=0"
                ),
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )

    except RuntimeError as error:
        return {
            "error": str(error),
        }, 503


@app.route("/camera/snapshot")
def camera_snapshot():
    try:
        jpeg = camera_stream.get_snapshot()

        return Response(
            jpeg,
            mimetype="image/jpeg",
            headers={
                "Cache-Control": "no-store",
            },
        )

    except RuntimeError as error:
        return {
            "error": str(error),
        }, 503


@app.route("/api/temperature/latest")
def get_temperature():
    collection = get_collection()

    limit = request.args.get(
        "limit",
        default=20,
        type=int,
    )

    limit = max(
        1,
        min(limit, 100),
    )

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
        .sort(
            "timestamp",
            -1,
        )
        .limit(limit)
    )

    data.reverse()

    return {
        "count": len(data),
        "data": data,
    }


atexit.register(camera_stream.stop)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,

        debug=False,
        use_reloader=False,

        threaded=True,
    )