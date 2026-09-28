#include <../include/display.h>

Adafruit_SSD1306 display(
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    &Wire,
    OLED_RESET);

void setupDisplay()
{
    Wire.begin(OLED_SDA, OLED_SCL);

    if (!display.begin(
            SSD1306_SWITCHCAPVCC,
            OLED_ADDRESS))
    {
        Serial.println(
            "Error: OLED display not found. Check wiring and address.");

        return;
    }

    display.clearDisplay();

    display.setTextColor(
        SSD1306_WHITE);

    display.setTextSize(1);

    display.setCursor(0, 0);

    display.println("IoT Project");
    display.println("ESP32");
    display.println("Initializing...");

    display.display();
}

void updateDisplay(
    float temperature,
    String message)
{
    display.clearDisplay();

    display.setTextSize(1);
    display.setTextColor(
        SSD1306_WHITE);

    display.setCursor(0, 0);

    display.println("ESP32 - IoT");

    display.drawLine(
        0,
        10,
        127,
        10,
        SSD1306_WHITE);

    display.setCursor(0, 15);

    display.print("Temp Chip: ");

    display.print(
        temperature,
        1);

    display.println(" C");

    display.println();
    display.println("Message:");

    display.println(message);

    display.display();
}