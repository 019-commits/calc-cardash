const Tesseract = require("tesseract.js");

/*

* =========================================================
* OCR
* =========================================================
  */

async function recognizeText(imageBuffer) {
if (!Buffer.isBuffer(imageBuffer)) {
throw new Error(
"OCR: необходимо передать Buffer изображения"
);
}

if (imageBuffer.length === 0) {
    throw new Error(
        "OCR: изображение пустое"
    );
}

console.log("Запускаем Tesseract OCR...");

const result = await Tesseract.recognize(
    imageBuffer,
    "rus+eng",
    {
        logger: (info) => {
            if (
                info.status === "recognizing text" &&
                typeof info.progress === "number"
            ) {
                console.log(
                    "OCR:",
                    Math.round(info.progress * 100) + "%"
                );
            }
        }
    }
);

const text =
    result &&
    result.data &&
    typeof result.data.text === "string"
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

/*

* =========================================================
* НОРМАЛИЗАЦИЯ
* =========================================================
  */

function normalizeText(text) {
return String(text || "")
.replace(/\r/g, "\n")
.replace(/[|]/g, " ")
.replace(/[ \t]+/g, " ")
.replace(/\n{2,}/g, "\n")
.trim();
}

/*

* =========================================================
* ЧИСЛО
* =========================================================
  */

function parseNumber(value) {
if (value === null || value === undefined) {
return null;
}


let normalized = String(value)
    .trim()
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

if (!normalized) {
    return null;
}

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

/*

* =========================================================
* ПОИСК ЧИСЛА
* =========================================================
  */

function findRate(text, patterns) {
for (const pattern of patterns) {
const match = text.match(pattern);


    if (!match) {
        continue;
    }

    const value = parseNumber(match[1]);

    if (value !== null) {
        return value;
    }
}

return null;


}

/*

* =========================================================
* РАСПОЗНАВАНИЕ КУРСОВ
* =========================================================
  */

async function recognizeRates(imageBuffer) {
const rawText =
await recognizeText(imageBuffer);


const text =
    normalizeText(rawText);

const rates = {};


/*
 * USD
 */

const usd = findRate(text, [
    /USD[\s:=\-]+(\d+[.,]\d+)/i,
    /US[D0][\s:=\-]+(\d+[.,]\d+)/i,
    /доллар[а-я\s]*[\s:=\-]+(\d+[.,]\d+)/i
]);

if (usd !== null) {
    rates.USD = usd;
}


/*
 * USD IDUBID
 */

const usdIdubid = findRate(text, [
    /USD[\s\S]{0,80}?IDUBID[\s:=\-]+(\d+[.,]\d+)/i,
    /IDUBID[\s:=\-]+(\d+[.,]\d+)/i
]);

if (usdIdubid !== null) {
    rates.USD_IDUBID = usdIdubid;
}


/*
 * JPY SWIFT
 */

const jpySwift = findRate(text, [
    /JPY[\s\S]{0,80}?SWIFT[\s:=\-]+(\d+[.,]\d+)/i,
    /SWIFT[\s:=\-]+(\d+[.,]\d+)/i
]);

if (jpySwift !== null) {
    rates.JPY_SWIFT = jpySwift;
}


/*
 * JPY INTERNAL
 */

const jpyInternal = findRate(text, [
    /JPY[\s\S]{0,80}?INTERNAL[\s:=\-]+(\d+[.,]\d+)/i,
    /INTERNAL[\s:=\-]+(\d+[.,]\d+)/i
]);

if (jpyInternal !== null) {
    rates.JPY_INTERNAL = jpyInternal;
}


/*
 * JPY CASH
 */

const jpyCash = findRate(text, [
    /AFA[\s\S]{0,50}?CASH[\s:=\-]+(\d+[.,]\d+)/i,
    /CASH[\s:=\-]+(\d+[.,]\d+)/i
]);

if (jpyCash !== null) {
    rates.JPY_AFA_CASH = jpyCash;
}


/*
 * JPY QR
 */

const jpyQr = findRate(text, [
    /AFA[\s\S]{0,50}?QR[\s:=\-]+(\d+[.,]\d+)/i,
    /QR[\s:=\-]+(\d+[.,]\d+)/i
]);

if (jpyQr !== null) {
    rates.JPY_AFA_QR = jpyQr;
}


/*
 * CNY
 */

const cny = findRate(text, [
    /CNY[\s:=\-]+(\d+[.,]\d+)/i,
    /CN[YV][\s:=\-]+(\d+[.,]\d+)/i,
    /кита[йя][\s:=\-]+(\d+[.,]\d+)/i
]);

if (cny !== null) {
    rates.CNY = cny;
}


/*
 * KRW
 */

const krw = findRate(text, [
    /KRW[\s:=\-]+(\d+[.,]\d+)/i,
    /K[RЯ]W[\s:=\-]+(\d+[.,]\d+)/i,
    /коре[яи][\s:=\-]+(\d+[.,]\d+)/i
]);

if (krw !== null) {
    rates.KRW = krw;
}


/*
 * THB
 */

const thb = findRate(text, [
    /THB[\s:=\-]+(\d+[.,]\d+)/i,
    /таиланд[\s:=\-]+(\d+[.,]\d+)/i,
    /тайланд[\s:=\-]+(\d+[.,]\d+)/i
]);

if (thb !== null) {
    rates.THB = thb;
}


/*
 * AED
 */

const aed = findRate(text, [
    /AED[\s:=\-]+(\d+[.,]\d+)/i,
    /A[EЕ]D[\s:=\-]+(\d+[.,]\d+)/i
]);

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


/*
 * ВАЖНО:
 *
 * Не выбрасываем ошибку здесь.
 *
 * Tesseract может распознать текст,
 * но не распознать цифры.
 *
 * Тогда server.js сохранит старые
 * значения курсов.
 */

return rates;


}

/*

* =========================================================
* EXPORT
* =========================================================
  */

module.exports = {
recognizeText,
recognizeRates
};
