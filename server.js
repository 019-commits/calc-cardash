const express = require("express");
const path = require("path");

const { getTelegramImage } = require("./telegram");
const { recognizeRates } = require("./ocr");

const app = express();

const PORT = process.env.PORT || 10000;

const TELEGRAM_CHANNEL =
process.env.TELEGRAM_CHANNEL || "LoyaltySwift";

const FALLBACK_RATES = {
USD: 87.20,
USD_IDUBID: 88.70,
JPY_SWIFT: 0.5530,
JPY_INTERNAL: 0.5530,
JPY_AFA_CASH: 0.5580,
JPY_AFA_QR: 0.5580,
CNY: 13.15,
KRW: 0.0636,
THB: 2.70,
AED: 23.50
};

let currentRates = {
...FALLBACK_RATES
};

let lastUpdate = null;
let lastImage = null;
let lastError = null;

app.use(express.json());

app.use(
express.static(
path.join(__dirname, "public")
)
);

/*

* Текущие курсы
  */
  app.get("/api/rates", (req, res) => {
  res.setHeader(
  "Cache-Control",
  "no-store, no-cache, must-revalidate"
  );

  res.json({
  success: true,
  rates: currentRates,
  updatedAt: lastUpdate,
  image: lastImage,
  source: "Telegram / LoyaltySwift",
  error: lastError
  });
  });

/*

* Ручное обновление
  */
  app.get("/api/update", async (req, res) => {
  try {
  const result = await updateRates();

  
   res.json({
       success: true,
       result
   });
 

  } catch (error) {
  console.error(
  "Ошибка ручного обновления:",
  error
  );

 
   lastError = error.message;

   res.status(500).json({
       success: false,
       error: error.message
   });


  }
  });

/*

* Получение картинки + OCR + обновление курсов
  */
  async function updateRates() {
  console.log(
  "Ищем последнюю картинку в Telegram..."
  );

  const image = await getTelegramImage(
  TELEGRAM_CHANNEL
  );

  if (!image) {
  throw new Error(
  "Не удалось получить изображение из Telegram"
  );
  }

  /*

  * telegram.js возвращает:
  *
  * {
  * ```
    buffer: Buffer,
   
  * 
    url: "https://..."
    
  * }
    */

  if (!Buffer.isBuffer(image.buffer)) {
  throw new Error(
  "telegram.js не вернул Buffer изображения"
  );
  }

  if (image.buffer.length === 0) {
  throw new Error(
  "Получено пустое изображение"
  );
  }

  console.log(
  "Найдена картинка:",
  image.url
  );

  console.log(
  "Размер изображения:",
  image.buffer.length,
  "bytes"
  );

  console.log(
  "Запускаем OCR..."
  );

  const recognized =
  await recognizeRates(
  image.buffer
  );

  console.log(
  "OCR результат:",
  recognized
  );

  /*

  * Если OCR ничего не нашёл,
  * старые курсы не ломаем.
    */
    if (
    !recognized ||
    typeof recognized !== "object" ||
    Object.keys(recognized).length === 0
    ) {
    throw new Error(
    "OCR не смог распознать ни одного курса"
    );
    }

  /*

  * Обновляем только найденные значения.
    */
    currentRates = {
    ...currentRates,
    ...recognized
    };

  lastUpdate =
  new Date().toISOString();

  lastImage =
  image.url;

  lastError = null;

  console.log(
  "Курсы успешно обновлены:"
  );

  console.log(
  currentRates
  );

  return {
  rates: currentRates,
  image: image.url,
  updatedAt: lastUpdate
  };
  }

/*

* Автоматическое обновление.
  */
  async function automaticUpdate() {
  try {
  await updateRates();

 
   console.log(
       "Курсы успешно обновлены"
   );
 

  } catch (error) {
  lastError =
  error.message;

  
   console.error(
       "Ошибка обновления:",
       error.message
   );
 

  }
  }

/*

* Запуск сервера.
  */
  app.listen(
  PORT,
  () => {
  console.log(
  "Server started on port " + PORT
  );

 
   /*
    * Запускаем обновление сразу.
    */
   automaticUpdate();

   /*
    * Потом каждые 10 минут.
    */
   setInterval(
       automaticUpdate,
       10 * 60 * 1000
   );


  }
  );
