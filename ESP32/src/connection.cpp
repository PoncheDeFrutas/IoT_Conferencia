#include <../include/connection.h>

void setupWiFi()
{
    WiFi.mode(WIFI_STA); // Set WiFi mode to Station (client)
}

void connectToWiFi()
{
    if (WiFi.status() == WL_CONNECTED)
        return;

    Serial.print("Connecting to WiFi network: ");
    Serial.println(WIFI_SSID); // Print the SSID to the Serial Monitor

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD); // Start the connection to the WiFi network

    unsigned long startAttemptTime = millis(); // Record the time when the connection attempt started
    const unsigned long timeout = 10000;       // Timeout duration in milliseconds

    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < timeout)
    {
        Serial.print(".");
        delay(100); // Wait for 100 milliseconds before checking the status again
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println("\nConnected to WiFi!");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP()); // Print the local IP address assigned to the ESP32
    }
    else
    {
        Serial.println("\nFailed to connect to WiFi. Please check your credentials.");
    }
}

void disconnectFromWiFi()
{
    WiFi.disconnect(); // Disconnect from the WiFi network
    Serial.println("Disconnected from WiFi.");
}

void printWiFiStatus()
{
    Serial.print("WiFi Status: ");
    switch (WiFi.status())
    {
    case WL_CONNECTED:
        Serial.println("Connected");
        break;
    case WL_DISCONNECTED:
        Serial.println("Disconnected");
        break;
    case WL_CONNECT_FAILED:
        Serial.println("Connection Failed");
        break;
    default:
        Serial.println("Unknown Status");
        break;
    }
}