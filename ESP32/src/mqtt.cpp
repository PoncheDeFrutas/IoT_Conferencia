#include <../include/mqtt.h>

WiFiClient espClient;
PubSubClient mqttClient(espClient);

String receivedCommand = ""; // Variable to store the received command

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
        if (mqttClient.connect("GRUPO1_ARQUI2"))
        {
            mqttClient.subscribe("GRUPO1_ARQUI2/comands/01");
        }
        else
        {
            delay(2000);
        }
    }
}

void publishSensorData()
{
    char buffer[16];

}

void callback(char *topic, byte *payload, unsigned int length)
{
    receivedCommand = ""; // Limpia el contenido previo

    for (unsigned int i = 0; i < length; i++)
    {
        receivedCommand += (char)payload[i];
    }

    Serial.print("Comando recibido: ");
    Serial.println(receivedCommand);

}