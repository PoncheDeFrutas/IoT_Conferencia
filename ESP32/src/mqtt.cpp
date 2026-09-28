#include <../include/mqtt.h>

WiFiClient espClient;
PubSubClient mqttClient(espClient);

String receivedCommand = "";

void setupMQTT()
{
    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setCallback(callback);
}

void mqttLoop()
{
    mqttClient.loop();
}

void reconnectMQTT()
{
    while (!mqttClient.connected())
    {
        if (mqttClient.connect("ARQUI1B_2026_ESP32"))
        {
            mqttClient.subscribe("ARQUI1B_2026/test");

            Serial.println("Connected to MQTT");
        }
        else
        {
            Serial.print("MQTT failed, rc=");
            Serial.println(mqttClient.state());

            delay(2000);
        }
    }
}

void publishSensorData()
{
    float temperature = temperatureRead();

    int wifiRSSI = WiFi.RSSI();

    String message =
        "ESP32 -Temperature: " +
        String(temperature, 1) +
        ", WiFi RSSI: " +
        String(wifiRSSI);

    mqttClient.publish(
        "ARQUI1B_2026/test",
        message.c_str());

    Serial.print("Published: ");
    Serial.println(message);
}

void callback(char *topic, byte *payload, unsigned int length)
{
    receivedCommand = "";

    for (unsigned int i = 0; i < length; i++)
    {
        receivedCommand += (char)payload[i];
    }

    Serial.print("Received command: ");
    Serial.println(receivedCommand);
}