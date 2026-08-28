```js
const Tesseract = require("tesseract.js");

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

    const text =
        result &&
        result.data &&
        result.data.text
            ? result.data.text
            : "";

    console.log("========== OCR TEXT ==========");
    console.log(text);
    console.log("===============================");

    if (!text.trim()) {
        throw new Error("OCR не распознал текст");
    }

    return text;
}

function parseNumber(value) {
    if (!value) {
        return null;
    }

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

    if (!Number.isFinite(number)) {
        return null;
    }

    return number;
}

function findRate(text, pattern) {
    const match = text.match(pattern);

    if (!match) {
        return null;
    }

    return parseNumber(match[1]);
}

async function recognizeRates(imageBuffer) {
    const rawText =
        await recognizeText(imageBuffer);

    const text =
        rawText
            .replace(/\r/g, "\n")
            .replace(/[|]/g, " ")
            .replace(/[ \t]+/g, " ")
            .replace(/\n{3,}/g, "\n")
            .trim();

    const rates = {};

    const usd = findRate(
        text,
        /USD[\s:=\-]+(\d+[.,]\d+)/i
    );

    if (usd !== null) {
        rates.USD = usd;
    }

    const usdIdubid = findRate(
        text,
        /IDUBID[\s:=\-]+(\d+[.,]\d+)/i
    );

    if (usdIdubid !== null) {
        rates.USD_IDUBID = usdIdubid;
    }

    const jpySwift = findRate(
        text,
        /SWIFT[\s:=\-]+(\d+[.,]\d+)/i
    );

    if (jpySwift !== null) {
        rates.JPY_SWIFT = jpySwift;
    }

    const jpyInternal = findRate(
        text,
        /INTERNAL[\s:=\-]+(\d+[.,]\d+)/i
    );

    if (jpyInternal !== null) {
        rates.JPY_INTERNAL = jpyInternal;
    }

    const afaCash = findRate(
        text,
        /CASH[\s:=\-]+(\d+[.,]\d+)/i
    );

    if (afaCash !== null) {
        rates.JPY_AFA_CASH = afaCash;
    }

    const afaQr = findRate(
        text,
        /QR[\s:=\-]+(\d+[.,]\d+)/i
    );

    if (afaQr !== null) {
        rates.JPY_AFA_QR = afaQr;
    }

    const cny = findRate(
        text,
        /CNY[\s:=\-]+(\d+[.,]\d+)/i
    );

    if (cny !== null) {
        rates.CNY = cny;
    }

    const krw = findRate(
        text,
        /KRW[\s:=\-]+(\d+[.,]\d+)/i
    );

    if (krw !== null) {
        rates.KRW = krw;
    }

    const thb = findRate(
        text,
        /THB[\s:=\-]+(\d+[.,]\d+)/i
    );

    if (thb !== null) {
        rates.THB = thb;
    }

    const aed = findRate(
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
