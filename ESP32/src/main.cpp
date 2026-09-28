#include <../include/main.h>

TaskHandle_t task1;

unsigned long lastPublishTime = 0;

const unsigned long publishInterval =
    2000;

unsigned long lastDisplayTime = 0;

const unsigned long displayInterval =
    500;

void setup()
{
  Serial.begin(115200);

  setupDisplay();
  setupWiFi();
  connectToWiFi();
  setupMQTT();
  xTaskCreatePinnedToCore(
      loop2,
      "loop2",
      4096,
      NULL,
      1,
      &task1,
      0);

  Serial.println(
      "ESP32 initialized");
}

void loop()
{
  if (!mqttClient.connected())
  {
    reconnectMQTT();
  }

  mqttLoop();

  unsigned long currentMillis =
      millis();

  if (
      currentMillis -
          lastPublishTime >=
      publishInterval)
  {
    lastPublishTime =
        currentMillis;

    publishSensorData();
  }

  if (
      currentMillis - lastDisplayTime >=
      displayInterval)
  {
    lastDisplayTime = currentMillis;

    float temperature =
        temperatureRead();

    updateDisplay(
        receivedCommand);
  }

  delay(1);
}

void loop2(void *parameter)
{
  while (true)
  {
    if (
        WiFi.status() !=
        WL_CONNECTED)
    {
      connectToWiFi();
    }

    vTaskDelay(
        1000 /
        portTICK_PERIOD_MS);
  }
}