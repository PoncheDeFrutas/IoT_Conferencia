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
        Serial.println("OLED not found");
        return;
    }

    display.clearDisplay();

    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(3);

    display.setCursor(0, 0);
    display.println("Esperando");
    display.println("mensaje...");

    display.display();
}

void updateDisplay(const String &message)
{
    display.clearDisplay();

    display.setTextColor(SSD1306_WHITE);

    display.setTextSize(3);

    display.setTextWrap(true);

    display.setCursor(0, 0);

    display.println(message);

    display.display();
}