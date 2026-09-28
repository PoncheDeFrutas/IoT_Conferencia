#ifndef MQTT_H
#define MQTT_H

#include <Arduino.h>
#include <PubSubClient.h>

#include <../include/connection.h>

#define MQTT_SERVER "broker.emqx.io"
#define MQTT_PORT 1883

#define MQTT_TOPIC_TELEMETRY \
    "ARQUI1B_2026/esp32/telemetry"

#define MQTT_TOPIC_COMMANDS \
    "ARQUI1B_2026/esp32/commands"

void setupMQTT();

void mqttLoop();

void reconnectMQTT();

void publishSensorData();

void callback(
    char *topic,
    byte *payload,
    unsigned int length
);

extern PubSubClient mqttClient;

extern String receivedCommand;

#endif