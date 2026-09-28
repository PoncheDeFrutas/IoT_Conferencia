#ifndef MQTT_H
#define MQTT_H

#include <PubSubClient.h>
#include <../include/connection.h>

#define MQTT_SERVER "broker.emqx.io"
#define MQTT_PORT 1883

void setupMQTT();
void mqttLoop();
void reconnectMQTT();
void publishSensorData();
void callback(char* topic, byte* payload, unsigned int length);

extern PubSubClient mqttClient;
extern String receivedCommand;
#endif // MQTT_H