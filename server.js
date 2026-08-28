const express = require("express");
const path = require("path");

const {
getTelegramImage
} = require("./telegram");

const {
recognizeRates
} = require("./ocr");

const app =
express();

const PORT =
process.env.PORT || 10000;

const TELEGRAM_CHANNEL =
process.env.TELEGRAM_CHANNEL ||
"LoyaltySwift";

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
```

};

let currentRates = {
...FALLBACK_RATES
};

let lastUpdate = null;
let lastImage = null;
let lastError = null;

app.use(
express.json()
);

app.use(
express.static(
path.join(
__dirname,
"public"
)
)
);

/*

* GET /api/rates
  */
  app.get(
  "/api/rates",
  (req, res) => {
  res.setHeader(
  "Cache-Control",
  "no-store, no-cache, must-revalidate"
  );


   res.json({
       success: true,
       rates: currentRates,
       updatedAt: lastUpdate,
       image: lastImage,
       source:
           "Telegram / LoyaltySwift",
       error: lastError
   });


  }
  );

/*

* GET /api/update
*
* Ручное обновление.
  */
  app.get(
  "/api/update",
  async (req, res) => {
  try {
  const result =
  await updateRates();


       res.json({
           success: true,
           result
       });

   } catch (error) {
       console.error(
           "Ошибка ручного обновления:",
           error
       );

       lastError =
           error.message;

       res.status(500).json({
           success: false,
           error:
               error.message
       });
   }


  }
  );

/*

* Получаем свежую картинку,
* отправляем её в OCR
* и обновляем курсы.
  */
  async function updateRates() {
  console.log(
  "Ищем последнюю картинку в Telegram..."
  );

  const image =
  await getTelegramImage(
  TELEGRAM_CHANNEL
  );

  if (!image) {
  throw new Error(
  "Telegram не вернул изображение"
  );
  }

  let imageBuffer;
  let imageUrl = null;

  /*

  * Поддерживаем объект:
  *
  * {
  * buffer,
  * url
  * }
    */
    if (
    Buffer.isBuffer(
    image
    )
    ) {
    imageBuffer =
    image;
    } else if (
    Buffer.isBuffer(
    image.buffer
    )
    ) {
    imageBuffer =
    image.buffer;

    imageUrl =
    image.url ||
    null;
    } else {
    throw new Error(
    "telegram.js не вернул Buffer изображения"
    );
    }

  if (
  imageBuffer.length === 0
  ) {
  throw new Error(
  "Получено пустое изображение"
  );
  }

  console.log(
  "Изображение получено:",
  imageBuffer.length,
  "bytes"
  );

  console.log(
  "Запускаем OCR..."
  );

  const recognized =
  await recognizeRates(
  imageBuffer
  );

  console.log(
  "OCR результат:"
  );

  console.log(
  recognized
  );

  if (
  !recognized ||
  typeof recognized !==
  "object"
  ) {
  throw new Error(
  "OCR не вернул объект с курсами"
  );
  }

  const keys =
  Object.keys(
  recognized
  );

  /*

  * Если OCR ничего не нашёл,
  * старые курсы не трогаем.
    */
    if (
    keys.length === 0
    ) {
    throw new Error(
    "OCR не смог распознать ни одного курса"
    );
    }

  /*

  * Обновляем только найденные
  * значения.
    */
    currentRates = {
    ...currentRates,
    ...recognized
    };

  lastUpdate =
  new Date().toISOString();

  if (imageUrl) {
  lastImage =
  imageUrl;
  }

  lastError =
  null;

  console.log(
  "Курсы успешно обновлены:"
  );

  console.log(
  currentRates
  );

  return {
  rates:
  currentRates,


   image:
       lastImage,

   updatedAt:
       lastUpdate


  };
  }

/*

* Автоматическое обновление.
  */
  async function automaticUpdate() {
  try {
  await updateRates();


   console.log(
       "Автоматическое обновление успешно"
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
  "Server started on port " +
  PORT
  );


   /*
    * Первое обновление сразу.
    */
   automaticUpdate();


   /*
    * Далее каждые 10 минут.
    */
   setInterval(
       automaticUpdate,
       10 * 60 * 1000
   );


  }
  );
