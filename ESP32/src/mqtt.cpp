#include <../include/mqtt.h>

WiFiClient espClient;

PubSubClient mqttClient(
    espClient);

String receivedCommand = "";

void setupMQTT()
{
    mqttClient.setServer(
        MQTT_SERVER,
        MQTT_PORT);

    mqttClient.setCallback(
        callback);
}

void mqttLoop()
{
    mqttClient.loop();
}

void reconnectMQTT()
{
    while (!mqttClient.connected())
    {
        Serial.println(
            "Connecting to MQTT...");

        if (mqttClient.connect(
                "ARQUI1B_2026_ESP32"))
        {
            Serial.println(
                "Connected to MQTT");

            mqttClient.subscribe(
                MQTT_TOPIC_COMMANDS);

            Serial.print(
                "Subscribed to: ");

            Serial.println(
                MQTT_TOPIC_COMMANDS);
        }
        else
        {
            Serial.print(
                "MQTT failed, rc=");

            Serial.println(
                mqttClient.state());

            delay(2000);
        }
    }
}

void publishSensorData()
{
    float temperature =
        temperatureRead();

    int wifiRSSI =
        WiFi.RSSI();

    String message =
        "ESP32 -Temperature: " +
        String(temperature, 1) +
        ", WiFi RSSI: " +
        String(wifiRSSI);

    bool result =
        mqttClient.publish(
            MQTT_TOPIC_TELEMETRY,
            message.c_str());

    if (result)
    {
        Serial.print(
            "Published: ");

        Serial.println(
            message);
    }
    else
    {
        Serial.println(
            "MQTT publish failed");
    }
}

void callback(
    char *topic,
    byte *payload,
    unsigned int length)
{
    receivedCommand = "";

    for (
        unsigned int i = 0;
        i < length;
        i++)
    {
        receivedCommand +=
            (char)payload[i];
    }

    receivedCommand.trim();

    Serial.print("MQTT RX [");
    Serial.print(topic);
    Serial.print("]: ");

    Serial.println(
        receivedCommand);
}