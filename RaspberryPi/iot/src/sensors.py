import time

import adafruit_dht
import board

from globals import shared

DHT_PIN = board.D20


class Sensors:
    def __init__(self):
        self.last_read_time = 0
        self.read_interval = 2
        self.sensor_dht = None

    def setup(self):
        self.sensor_dht = adafruit_dht.DHT11(DHT_PIN)

    def read(self):
        current_time = time.time()

        if current_time - self.last_read_time >= self.read_interval:
            try:
                shared.temperature = self.sensor_dht.temperature
                shared.humidity = self.sensor_dht.humidity
                self.last_read_time = current_time
            except RuntimeError as e:
                shared.local_message = f"Error reading DHT11 sensor: {e}"
