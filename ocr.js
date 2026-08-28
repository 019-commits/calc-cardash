```js
const Tesseract = require("tesseract.js");

/**
 * Распознавание текста с картинки.
 */
async function recognizeText(imageBuffer) {
    if (!imageBuffer) {
        throw new Error(
            "OCR: изображение не передано"
        );
    }

    console.log(
        "Запускаем Tesseract OCR..."
    );

    const result =
        await Tesseract.recognize(
            imageBuffer,
            "eng+rus",
            {
                logger: (info) => {
                    if (
                        info.status ===
                        "recognizing text"
                    ) {
                        const progress =
                            Math.round(
                                info.progress * 100
                            );

                        console.log(
                            `OCR: ${progress}%`
                        );
                    }
                }
            }
        );

    const text =
        result &&
        result.data &&
        result.data.text
            ? result.data.text
            : "";

    console.log(
        "========== OCR TEXT =========="
    );

    console.log(text);

    console.log(
        "==============================="
    );

    if (!text.trim()) {
        throw new Error(
            "OCR не распознал текст"
        );
    }

    return text;
}

/**
 * Преобразование найденного значения
 * в число.
 */
function parseNumber(value) {
    if (!value) {
        return null;
    }

    let normalized =
        String(value)
            .trim()
            .replace(",", ".")
            .replace(/[^\d.]/g, "");

    const parts =
        normalized.split(".");

    if (parts.length > 2) {
        normalized =
            parts[0] +
            "." +
            parts.slice(1).join("");
    }

    const number =
        Number(normalized);

    if (!Number.isFinite(number)) {
        return null;
    }

    return number;
}

/**
 * Ищет курс по регулярному выражению.
 */
function findRate(text, pattern) {
    const match =
        text.match(pattern);

    if (!match) {
        return null;
    }

    return parseNumber(
        match[1]
    );
}

/**
 * Распознаёт курсы валют
 * из текста OCR.
 */
async function recognizeRates(imageBuffer) {
    const text =
        await recognizeText(
            imageBuffer
        );

    const rates = {};

    /*
     * USD
     */
    const usd =
        findRate(
            text,
            /USD[\s:=\-]+(\d+[.,]\d+)/i
        );

    if (usd !== null) {
        rates.USD = usd;
    }

    /*
     * USD / IDUBID
     */
    const usdIdubid =
        findRate(
            text,
            /IDUBID[\s:=\-]+(\d+[.,]\d+)/i
        );

    if (usdIdubid !== null) {
        rates.USD_IDUBID =
            usdIdubid;
    }

    /*
     * JPY / SWIFT
     */
    const jpySwift =
        findRate(
            text,
            /SWIFT[\s:=\-]+(\d+[.,]\d+)/i
        );

    if (jpySwift !== null) {
        rates.JPY_SWIFT =
            jpySwift;
    }

    /*
     * JPY / INTERNAL
     */
    const jpyInternal =
        findRate(
            text,
            /INTERNAL[\s:=\-]+(\d+[.,]\d+)/i
        );

    if (jpyInternal !== null) {
        rates.JPY_INTERNAL =
            jpyInternal;
    }

    /*
     * AFA / CASH
     */
    const afaCash =
        findRate(
            text,
            /CASH[\s:=\-]+(\d+[.,]\d+)/i
        );

    if (afaCash !== null) {
        rates.JPY_AFA_CASH =
            afaCash;
    }

    /*
     * AFA / QR
     */
    const afaQr =
        findRate(
            text,
            /QR[\s:=\-]+(\d+[.,]\d+)/i
        );

    if (afaQr !== null) {
        rates.JPY_AFA_QR =
            afaQr;
    }

    /*
     * CNY
     */
    const cny =
        findRate(
            text,
            /CNY[\s:=\-]+(\d+[.,]\d+)/i
        );

    if (cny !== null) {
        rates.CNY = cny;
    }

    /*
     * KRW
     */
    const krw =
        findRate(
            text,
            /KRW[\s:=\-]+(\d+[.,]\d+)/i
        );

    if (krw !== null) {
        rates.KRW = krw;
    }

    /*
     * THB
     */
    const thb =
        findRate(
            text,
            /THB[\s:=\-]+(\d+[.,]\d+)/i
        );

    if (thb !== null) {
        rates.THB = thb;
    }

    /*
     * AED
     */
    const aed =
        findRate(
            text,
            /AED[\s:=\-]+(\d+[.,]\d+)/i
        );

    if (aed !== null) {
        rates.AED = aed;
    }

    console.log(
        "========== RECOGNIZED RATES =========="
    );

    console.log(rates);

    console.log(
        "======================================="
    );

    return rates;
}

module.exports = {
    recognizeText,
    recognizeRates
};
```
