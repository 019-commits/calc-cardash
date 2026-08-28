```js
const Tesseract = require("tesseract.js");

/**
 * Распознаёт текст с изображения.
 */
async function recognizeText(imageBuffer) {
    if (!imageBuffer) {
        throw new Error("OCR: изображение не передано");
    }

    console.log("Запускаем Tesseract OCR...");

    const result = await Tesseract.recognize(
        imageBuffer,
        "eng+rus",
        {
            logger: (info) => {
                if (
                    info.status === "recognizing text" &&
                    typeof info.progress === "number"
                ) {
                    console.log(
                        `OCR: ${Math.round(info.progress * 100)}%`
                    );
                }
            }
        }
    );

    const text = result?.data?.text || "";

    if (!text.trim()) {
        throw new Error("OCR не распознал текст");
    }

    console.log("========== OCR TEXT ==========");
    console.log(text);
    console.log("===============================");

    return text;
}

/**
 * Приводим OCR-текст к более удобному виду.
 */
function normalizeText(text) {
    return text
        .replace(/\r/g, "\n")
        .replace(/[|]/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n")
        .trim();
}

/**
 * Преобразование OCR-числа в Number.
 *
 * OCR может вернуть:
 * 87,20
 * 87.20
 * 0,5530
 * 0.5530
 */
function parseNumber(value) {
    if (!value) return null;

    let normalized = String(value)
        .trim()
        .replace(",", ".")
        .replace(/[^\d.]/g, "");

    const parts = normalized.split(".");

    if (parts.length > 2) {
        normalized =
            parts[0] +
            "." +
            parts.slice(1).join("");
    }

    const number = Number(normalized);

    return Number.isFinite(number) ? number : null;
}

/**
 * Ищет число рядом с названием курса.
 *
 * Например:
 * USD 87.20
 * USD: 87.20
 * Swift 0.5530
 */
function findRate(text, patterns) {
    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match) {
            const value = parseNumber(match[1]);

            if (value !== null) {
                return value;
            }
        }
    }

    return null;
}

/**
 * Распознаёт курсы из OCR.
 *
 * ВАЖНО:
 * Мы не заменяем существующие курсы,
 * если конкретное значение не удалось распознать.
 */
async function recognizeRates(imageBuffer) {
    const rawText = await recognizeText(imageBuffer);
    const text = normalizeText(rawText);

    const rates = {};

    /*
     * USD
     */
    const usd = findRate(text, [
        /USD[\s:=-]+(\d+[.,]\d+)/i,
        /US[D0][\s:=-]+(\d+[.,]\d+)/i,
        /доллар[\s\S]{0,30}?(\d+[.,]\d+)/i
    ]);

    if (usd !== null) {
        rates.USD = usd;
    }

    /*
     * USD IDUBID
     */
    const usdIdubid = findRate(text, [
        /USD[\s\S]{0,50}?IDUBID[\s:=-]+(\d+[.,]\d+)/i,
        /IDUBID[\s:=-]+(\d+[.,]\d+)/i
    ]);

    if (usdIdubid !== null) {
        rates.USD_IDUBID = usdIdubid;
    }

    /*
     * JPY Swift
     */
    const jpySwift = findRate(text, [
        /JPY[\s\S]{0,50}?SWIFT[\s:=-]+(\d+[.,]\d+)/i,
        /SWIFT[\s\S]{0,30}?(\d+[.,]\d+)/i
    ]);

    if (jpySwift !== null) {
        rates.JPY_SWIFT = jpySwift;
    }

    /*
     * JPY Internal
     */
    const jpyInternal = findRate(text, [
        /JPY[\s\S]{0,50}?INTERNAL[\s:=-]+(\d+[.,]\d+)/i,
        /INTERNAL[\s:=-]+(\d+[.,]\d+)/i
    ]);

    if (jpyInternal !== null) {
        rates.JPY_INTERNAL = jpyInternal;
    }

    /*
     * JPY AFA CASH
     */
    const jpyAfaCash = findRate(text, [
        /AFA[\s\S]{0,30}?CASH[\s:=-]+(\d+[.,]\d+)/i,
        /CASH[\s:=-]+(\d+[.,]\d+)/i
    ]);

    if (jpyAfaCash !== null) {
        rates.JPY_AFA_CASH = jpyAfaCash;
    }

    /*
     * JPY AFA QR
     */
    const jpyAfaQr = findRate(text, [
        /AFA[\s\S]{0,30}?QR[\s:=-]+(\d+[.,]\d+)/i,
        /QR[\s:=-]+(\d+[.,]\d+)/i
    ]);

    if (jpyAfaQr !== null) {
        rates.JPY_AFA_QR = jpyAfaQr;
    }

    /*
     * Остальные валюты.
     */
    const currencies = [
        ["CNY", /CNY[\s:=-]+(\d+[.,]\d+)/i],
        ["KRW", /KRW[\s:=-]+(\d+[.,]\d+)/i],
        ["THB", /THB[\s:=-]+(\d+[.,]\d+)/i],
        ["AED", /AED[\s:=-]+(\d+[.,]\d+)/i]
    ];

    for (const [key, pattern] of currencies) {
        const value = findRate(text, [pattern]);

        if (value !== null) {
            rates[key] = value;
        }
    }

    console.log("========== RECOGNIZED RATES ==========");
    console.log(rates);
    console.log("=======================================");

    if (Object.keys(rates).length === 0) {
        throw new Error(
            "OCR отработал, но курсы не удалось распознать"
        );
    }

    return rates;
}

module.exports = {
    recognizeText,
    recognizeRates
};
```
