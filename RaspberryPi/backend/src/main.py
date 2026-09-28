import os

from dotenv import load_dotenv
from flask import Flask, request
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

app = Flask(__name__)

CORS(app)

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB")
MONGODB_COLLECTION = os.getenv("MONGODB_COLLECTION")

collection = None


def get_collection():
    global collection

    if collection is None:
        client = MongoClient(MONGODB_URI, server_api=ServerApi("1"))

        collection = client[MONGODB_DB][MONGODB_COLLECTION]

    return collection


@app.route("/")
def index():
    return {"status": "ok"}


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
    app.run(debug=True, port=5000)
