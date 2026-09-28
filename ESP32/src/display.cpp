#include <../include/display.h>

Adafruit_SSD1306 display(
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    &Wire,
    OLED_RESET
);

void setupDisplay()
{
    Wire.begin(OLED_SDA, OLED_SCL);

    if (!display.begin(
            SSD1306_SWITCHCAPVCC,
            OLED_ADDRESS))
    {
        Serial.println(
            "Error: OLED display not found."
        );

        return;
    }

    display.clearDisplay();

    display.setTextColor(
        SSD1306_WHITE
    );

    display.setTextSize(1);

    display.setCursor(0, 0);

    display.println("IoT Conferencia");
    display.println("ESP32");
    display.println();
    display.println("Inicializando...");

    display.display();

    Serial.println("OLED initialized");
}

void updateDisplay(
    float temperature,
    const String &message)
{
    display.clearDisplay();

    display.setTextColor(
        SSD1306_WHITE
    );

    display.setTextSize(1);

    display.setCursor(0, 0);

    display.println("ESP32 - IoT");

    display.drawLine(
        0,
        10,
        127,
        10,
        SSD1306_WHITE
    );

    display.setCursor(0, 15);

    display.print("Chip Temp: ");
    display.print(temperature, 1);
    display.println(" C");

    display.drawLine(
        0,
        27,
        127,
        27,
        SSD1306_WHITE
    );

    display.setCursor(0, 32);

    display.println("MQTT:");

    if (message.length() > 0)
    {
        display.println(message);
    }
    else
    {
        display.println("Sin mensajes");
    }

    display.display();
}