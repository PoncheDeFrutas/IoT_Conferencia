#ifndef CONNECTION_H
#define CONNECTION_H

#include <Arduino.h>
#include <WiFi.h>

#define WIFI_SSID ""
#define WIFI_PASSWORD ""

void setupWiFi();
void connectToWiFi();
void disconnectFromWiFi();
void printWiFiStatus();

#endif // CONNECTION_H