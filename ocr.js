const Tesseract = require("tesseract.js");

async function recognizeText(imageBuffer) {
if (!Buffer.isBuffer(imageBuffer)) {
throw new Error("OCR: ожидается Buffer изображения");
}

```
if (imageBuffer.length === 0) {
    throw new Error("OCR: изображение пустое");
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
    typeof result.data.text === "string"
        ? result.data.text
        : "";

console.log("========== OCR TEXT ==========");
console.log(text);
console.log("===============================");

if (!text.trim()) {
    throw new Error("OCR не распознал текст");
}

return text;
```

}

/*

* Нормализация OCR-текста.
  */
  function normalizeText(text) {
  return String(text || "")
  .replace(/\r/g, "\n")
  .replace(/[|]/g, " ")
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n")
  .trim();
  }

/*

* Преобразование OCR-значения в число.
  */
  function parseNumber(value) {
  if (value === null || value === undefined) {
  return null;
  }

  let normalized = String(value)
  .trim()
  .replace(/,/g, ".")
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

* Проверяем число.
  */
  function validRate(value) {
  return (
  value !== null &&
  Number.isFinite(value) &&
  value > 0 &&
  value < 100000
  );
  }

/*

* Ищем числа во всём тексте.
  */
  function extractNumbers(text) {
  const matches = String(text || "").match(
  /\d+(?:[.,]\d+)?/g
  );

  if (!matches) {
  return [];
  }

  return matches
  .map(parseNumber)
  .filter(validRate);
  }

/*

* Ищем число в строке.
  */
  function numberFromLine(line) {
  if (!line) {
  return null;
  }

  const matches = line.match(
  /\d+(?:[.,]\d+)?/g
  );

  if (!matches || matches.length === 0) {
  return null;
  }

  /*

  * Обычно нужное значение находится
  * в последнем числе строки.
    */
    for (let i = matches.length - 1; i >= 0; i--) {
    const value = parseNumber(matches[i]);

    if (validRate(value)) {
    return value;
    }
    }

  return null;
  }

/*

* Ищем число рядом с ключевыми словами.
  */
  function findNearKeyword(text, keywords, options = {}) {
  const lines = String(text || "")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

  const distance =
  options.distance || 2;

  for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  ```
   const foundKeyword = keywords.some(
       (keyword) =>
           line.toLowerCase().includes(
               keyword.toLowerCase()
           )
   );

   if (!foundKeyword) {
       continue;
   }

   /*
    * Сначала проверяем текущую строку.
    */
   const currentValue =
       numberFromLine(line);

   if (validRate(currentValue)) {
       return currentValue;
   }

   /*
    * Затем несколько следующих строк.
    */
   for (
       let offset = 1;
       offset <= distance;
       offset++
   ) {
       const nextLine =
           lines[i + offset];

       if (!nextLine) {
           break;
       }

       const value =
           numberFromLine(nextLine);

       if (validRate(value)) {
           return value;
       }
   }

   /*
    * И несколько предыдущих строк.
    */
   for (
       let offset = 1;
       offset <= distance;
       offset++
   ) {
       const previousLine =
           lines[i - offset];

       if (!previousLine) {
           break;
       }

       const value =
           numberFromLine(previousLine);

       if (validRate(value)) {
           return value;
       }
   }
  ```

  }

  return null;
  }

/*

* Ищем курс по регулярному выражению.
  */
  function findRegexRate(text, patterns) {
  for (const pattern of patterns) {
  const match = text.match(pattern);

  ```
   if (!match) {
       continue;
   }

   const value =
       parseNumber(match[1]);

   if (validRate(value)) {
       return value;
   }
  ```

  }

  return null;
  }

/*

* Распознавание курсов.
  */
  async function recognizeRates(imageBuffer) {
  const rawText =
  await recognizeText(imageBuffer);

  const text =
  normalizeText(rawText);

  const rates = {};

  /*

  * ============================
  * USD
  * ============================
    */

  let usd =
  findRegexRate(text, [
  /USD\s*[:=-]?\s*(\d+[.,]\d+)/i,
  /US[D0]\s*[:=-]?\s*(\d+[.,]\d+)/i
  ]);

  if (usd === null) {
  usd =
  findNearKeyword(
  text,
  [
  "доллар",
  "долл",
  "usd",
  "usa",
  "америка"
  ]
  );
  }

  if (validRate(usd)) {
  rates.USD = usd;
  }

  /*

  * ============================
  * USD IDUBID
  * ============================
    */

  let usdIdubid =
  findRegexRate(text, [
  /IDUBID\s*[:=-]?\s*(\d+[.,]\d+)/i,
  /USD[\s\S]{0,80}?IDUBID[\s:=-]*(\d+[.,]\d+)/i
  ]);

  if (usdIdubid === null) {
  usdIdubid =
  findNearKeyword(
  text,
  [
  "idubid",
  "idub",
  "иду",
  "идуб"
  ]
  );
  }

  if (validRate(usdIdubid)) {
  rates.USD_IDUBID = usdIdubid;
  }

  /*

  * ============================
  * JPY SWIFT
  * ============================
    */

  let jpySwift =
  findRegexRate(text, [
  /JPY[\s\S]{0,60}?SWIFT\s*[:=-]?\s*(\d+[.,]\d+)/i,
  /SWIFT\s*[:=-]?\s*(\d+[.,]\d+)/i
  ]);

  if (jpySwift === null) {
  jpySwift =
  findNearKeyword(
  text,
  [
  "swift",
  "свифт"
  ]
  );
  }

  if (validRate(jpySwift)) {
  rates.JPY_SWIFT = jpySwift;
  }

  /*

  * ============================
  * JPY INTERNAL
  * ============================
    */

  let jpyInternal =
  findRegexRate(text, [
  /JPY[\s\S]{0,60}?INTERNAL\s*[:=-]?\s*(\d+[.,]\d+)/i,
  /INTERNAL\s*[:=-]?\s*(\d+[.,]\d+)/i
  ]);

  if (jpyInternal === null) {
  jpyInternal =
  findNearKeyword(
  text,
  [
  "internal",
  "интернал",
  "внутрен"
  ]
  );
  }

  if (validRate(jpyInternal)) {
  rates.JPY_INTERNAL =
  jpyInternal;
  }

  /*

  * ============================
  * JPY AFA CASH
  * ============================
    */

  let jpyAfaCash =
  findRegexRate(text, [
  /AFA[\s\S]{0,50}?CASH\s*[:=-]?\s*(\d+[.,]\d+)/i,
  /CASH\s*[:=-]?\s*(\d+[.,]\d+)/i
  ]);

  if (jpyAfaCash === null) {
  jpyAfaCash =
  findNearKeyword(
  text,
  [
  "cash",
  "кэш",
  "налич"
  ]
  );
  }

  if (validRate(jpyAfaCash)) {
  rates.JPY_AFA_CASH =
  jpyAfaCash;
  }

  /*

  * ============================
  * JPY AFA QR
  * ============================
    */

  let jpyAfaQr =
  findRegexRate(text, [
  /AFA[\s\S]{0,50}?QR\s*[:=-]?\s*(\d+[.,]\d+)/i,
  /QR\s*[:=-]?\s*(\d+[.,]\d+)/i
  ]);

  if (jpyAfaQr === null) {
  jpyAfaQr =
  findNearKeyword(
  text,
  [
  "qr",
  "qr код"
  ]
  );
  }

  if (validRate(jpyAfaQr)) {
  rates.JPY_AFA_QR =
  jpyAfaQr;
  }

  /*

  * ============================
  * CNY
  * ============================
    */

  let cny =
  findRegexRate(text, [
  /CNY\s*[:=-]?\s*(\d+[.,]\d+)/i
  ]);

  if (cny === null) {
  cny =
  findNearKeyword(
  text,
  [
  "китай",
  "юань",
  "cny",
  "cny"
  ]
  );
  }

  if (validRate(cny)) {
  rates.CNY = cny;
  }

  /*

  * ============================
  * KRW
  * ============================
    */

  let krw =
  findRegexRate(text, [
  /KRW\s*[:=-]?\s*(\d+[.,]\d+)/i
  ]);

  if (krw === null) {
  krw =
  findNearKeyword(
  text,
  [
  "корея",
  "южная корея",
  "вон",
  "krw"
  ]
  );
  }

  if (validRate(krw)) {
  rates.KRW = krw;
  }

  /*

  * ============================
  * THB
  * ============================
    */

  let thb =
  findRegexRate(text, [
  /THB\s*[:=-]?\s*(\d+[.,]\d+)/i
  ]);

  if (thb === null) {
  thb =
  findNearKeyword(
  text,
  [
  "таиланд",
  "тайланд",
  "бат",
  "thb"
  ]
  );
  }

  if (validRate(thb)) {
  rates.THB = thb;
  }

  /*

  * ============================
  * AED
  * ============================
    */

  let aed =
  findRegexRate(text, [
  /AED\s*[:=-]?\s*(\d+[.,]\d+)/i
  ]);

  if (aed === null) {
  aed =
  findNearKeyword(
  text,
  [
  "оаэ",
  "дирхам",
  "aed",
  "араб"
  ]
  );
  }

  if (validRate(aed)) {
  rates.AED = aed;
  }

  /*

  * Выводим найденные курсы.
    */

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
  * Не бросаем ошибку здесь.
  *
  * Если Tesseract распознал текст,
  * но не смог определить курсы,
  * сервер остаётся рабочим.
    */

  return rates;
  }

module.exports = {
recognizeText,
recognizeRates,
normalizeText,
parseNumber
};
