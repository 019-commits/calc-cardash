const Tesseract = require("tesseract.js");

async function recognizeText(
imageBuffer
) {
if (
!Buffer.isBuffer(
imageBuffer
)
) {
throw new Error(
"OCR: нужен Buffer изображения"
);
}


if (
    imageBuffer.length === 0
) {
    throw new Error(
        "OCR: изображение пустое"
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
                    "recognizing text" &&
                    typeof info.progress ===
                        "number"
                ) {
                    console.log(
                        "OCR:",
                        Math.round(
                            info.progress *
                                100
                        ) + "%"
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

return text;


}

function normalizeText(
text
) {
return String(text || "")
.replace(
/\r/g,
"\n"
)
.replace(
/[|]/g,
" "
)
.replace(
/[ \t]+/g,
" "
)
.replace(
/\n{3,}/g,
"\n"
)
.trim();
}

function parseNumber(
value
) {
if (
value === null ||
value === undefined
) {
return null;
}


let normalized =
    String(value)
        .trim()
        .replace(
            /,/g,
            "."
        )
        .replace(
            /[^0-9.]/g,
            ""
        );

if (!normalized) {
    return null;
}

const parts =
    normalized.split(".");

if (
    parts.length > 2
) {
    normalized =
        parts[0] +
        "." +
        parts
            .slice(1)
            .join("");
}

const number =
    Number(normalized);

if (
    !Number.isFinite(
        number
    )
) {
    return null;
}

return number;


}

function findRate(
text,
patterns
) {
const list =
Array.isArray(patterns)
? patterns
: [patterns];


for (
    const pattern of list
) {
    const match =
        text.match(pattern);

    if (
        match &&
        match[1]
    ) {
        const value =
            parseNumber(
                match[1]
            );

        if (
            value !== null
        ) {
            return value;
        }
    }
}

return null;


}

function extractAllNumbers(
text
) {
const matches =
text.match(
/\d+[.,]\d+|\d+/g
) || [];


return matches
    .map(
        parseNumber
    )
    .filter(
        (value) =>
            value !== null
    );


}

async function recognizeRates(
imageBuffer
) {
const rawText =
await recognizeText(
imageBuffer
);


const text =
    normalizeText(
        rawText
    );

const rates = {};


/*
 * USD
 */

let value =
    findRate(
        text,
        [
            /USD[\s:=\-]+(\d+[.,]\d+)/i,
            /US[D0][\s:=\-]+(\d+[.,]\d+)/i,
            /доллар[\s\S]{0,50}?(\d+[.,]\d+)/i
        ]
    );

if (
    value !== null
) {
    rates.USD = value;
}


/*
 * USD / IDUBID
 */

value =
    findRate(
        text,
        [
            /IDUBID[\s:=\-]+(\d+[.,]\d+)/i,
            /USD[\s\S]{0,80}?IDUBID[\s:=\-]+(\d+[.,]\d+)/i
        ]
    );

if (
    value !== null
) {
    rates.USD_IDUBID =
        value;
}


/*
 * JPY / SWIFT
 */

value =
    findRate(
        text,
        [
            /JPY[\s\S]{0,80}?SWIFT[\s:=\-]+(\d+[.,]\d+)/i,
            /SWIFT[\s:=\-]+(\d+[.,]\d+)/i
        ]
    );

if (
    value !== null
) {
    rates.JPY_SWIFT =
        value;
}


/*
 * JPY / INTERNAL
 */

value =
    findRate(
        text,
        [
            /JPY[\s\S]{0,80}?INTERNAL[\s:=\-]+(\d+[.,]\d+)/i,
            /INTERNAL[\s:=\-]+(\d+[.,]\d+)/i
        ]
    );

if (
    value !== null
) {
    rates.JPY_INTERNAL =
        value;
}


/*
 * AFA CASH
 */

value =
    findRate(
        text,
        [
            /AFA[\s\S]{0,50}?CASH[\s:=\-]+(\d+[.,]\d+)/i,
            /CASH[\s:=\-]+(\d+[.,]\d+)/i
        ]
    );

if (
    value !== null
) {
    rates.JPY_AFA_CASH =
        value;
}


/*
 * AFA QR
 */

value =
    findRate(
        text,
        [
            /AFA[\s\S]{0,50}?QR[\s:=\-]+(\d+[.,]\d+)/i,
            /QR[\s:=\-]+(\d+[.,]\d+)/i
        ]
    );

if (
    value !== null
) {
    rates.JPY_AFA_QR =
        value;
}


/*
 * Остальные валюты.
 */

const currencies = [
    [
        "CNY",
        /CNY[\s:=\-]+(\d+[.,]\d+)/i
    ],
    [
        "KRW",
        /KRW[\s:=\-]+(\d+[.,]\d+)/i
    ],
    [
        "THB",
        /THB[\s:=\-]+(\d+[.,]\d+)/i
    ],
    [
        "AED",
        /AED[\s:=\-]+(\d+[.,]\d+)/i
    ]
];

for (
    const [
        key,
        pattern
    ] of currencies
) {
    value =
        findRate(
            text,
            pattern
        );

    if (
        value !== null
    ) {
        rates[key] =
            value;
    }
}


/*
 * Если OCR не распознал буквенные
 * обозначения валют, выводим все числа.
 *
 * Это поможет понять структуру
 * картинки в Render Logs.
 */

if (
    Object.keys(
        rates
    ).length === 0
) {
    const numbers =
        extractAllNumbers(
            text
        );

    console.log(
        "OCR числа:",
        numbers
    );
}


console.log(
    "========== RECOGNIZED RATES =========="
);

console.log(
    rates
);

console.log(
    "======================================="
);

return rates;


}

module.exports = {
recognizeText,
recognizeRates,
normalizeText,
parseNumber
};
