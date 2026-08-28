const {
    getTelegramImage
} = require("./telegram");

const {
    recognizeText
} = require("./ocr");


async function getRates() {

    console.log(
        "Ищем последнюю картинку в Telegram..."
    );

    const image =
        await getTelegramImage();

    console.log(
        "Картинка получена:",
        image.length,
        "bytes"
    );

    const text =
        await recognizeText(image);

    console.log(
        "OCR завершён."
    );

    /*
     * Пока не пытаемся угадывать курсы.
     * Сначала посмотрим настоящий текст,
     * который распознал OCR.
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
