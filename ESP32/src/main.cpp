#include <../include/main.h>

TaskHandle_t task1;

unsigned long lastPublishTime = 0;
const unsigned long publishInterval = 2000;

void setup()
{
  Serial.begin(115200);
  xTaskCreatePinnedToCore(
      loop2, "loop2", 4096, NULL, 1, &task1, 0);

  setupWiFi();     // Initialize WiFi
  connectToWiFi(); // Connect to WiFi
  setupMQTT();     // Initialize MQTT
}

void loop()
{
  if (!mqttClient.connected())
  {
    reconnectMQTT(); // Reconnect to MQTT if disconnected
  }

  mqttClient.loop(); // Process MQTT messages

  unsigned long currentMillis = millis();
  if (currentMillis - lastPublishTime >= publishInterval)
  {
    lastPublishTime = currentMillis;
    publishSensorData(); // Publish sensor data to MQTT
  }

  delay(1);
}

void loop2(void *parameter)
{
  while (true)
  {
    if (WiFi.status() != WL_CONNECTED)
    {
      connectToWiFi(); // Attempt to reconnect if disconnected
    }

    vTaskDelay(1000 / portTICK_PERIOD_MS); // Delay for 1 second
  }
}