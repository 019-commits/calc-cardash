const {
    downloadTelegramImage
} = require("./telegram");

const {
    recognizeRates
} = require("./ocr");

async function getRates() {

    const image =
        await downloadTelegramImage();

    const text =
        await recognizeRates(image);

    console.log(
        "Полученный текст:",
        text
    );

    /*
     * Пока возвращаем структуру,
     * которую ожидает твой калькулятор.
     *
     * Распознавание конкретных цифр
     * добавим после проверки OCR.
     */

    return {

        USD_SWIFT: 0,
        USD_IDUBID: 0,

        JPY_SWIFT: 0,
        JPY_INTERNAL: 0,
        JPY_CASH: 0,
        JPY_QR: 0,

        CNY: 0,
        KRW: 0,
        THB: 0,
        AED: 0

    };

}

module.exports = {
    getRates
};