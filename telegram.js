const axios = require("axios");

const CHANNEL = "LoyaltySwift";

const HEADERS = {
"User-Agent":
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
"AppleWebKit/537.36 (KHTML, like Gecko) " +
"Chrome/131.0 Safari/537.36",
"Accept":
"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
"Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
};

/*

* Получает HTML публичной ленты Telegram.
  */
  async function getTelegramHtml() {
  const url = `https://t.me/s/${CHANNEL}`;

  console.log(
  "Открываем ленту Telegram:",
  url
  );

  const response = await axios.get(
  url,
  {
  timeout: 30000,
  headers: HEADERS,
  maxRedirects: 5
  }
  );

  if (
  !response.data ||
  typeof response.data !== "string"
  ) {
  throw new Error(
  "Telegram не вернул HTML"
  );
  }

  console.log(
  "Telegram HTML получен:",
  response.data.length,
  "bytes"
  );

  return response.data;
  }

/*

* Извлекает URL картинки из CSS background-image.
*
* Telegram использует примерно такой HTML:
*
* <a class="tgme_widget_message_photo_wrap"
* style="background-image:url('[https://cdn...jpg')">](https://cdn...jpg'%29%22>)
  */
  function extractBackgroundImage(value) {
  if (!value) {
  return null;
  }


const patterns = [



    /url\(\s*["']([^"']+)["']\s*\)/i,
    /url\(\s*([^)"']+)\s*\)/i
];

for (const pattern of patterns) {
    const match = value.match(pattern);

    if (match && match[1]) {
        return decodeHtmlEntities(
            match[1].trim()
        );
    }
}

return null;


}

/*

* Декодирование HTML entities.
  */
  function decodeHtmlEntities(value) {
  return value
  .replace(/&/g, "&")
  .replace(/"/g, '"')
  .replace(/'/g, "'")
  .replace(/</g, "<")
  .replace(/>/g, ">");
  }

/*

* Получает картинки именно из сообщений Telegram.
*
* ВАЖНО:
* Не используем og:image, потому что для /s/channel
* это может быть картинка самого канала, а не поста.
  */
  function extractPostImages(html) {
  const images = [];

  /*

  * Каждый Telegram-пост имеет:
  *
  * tgme_widget_message_wrap
  *
  * Внутри фотографии находятся:
  *
  * tgme_widget_message_photo_wrap
    */
    const messageRegex =
    /<div[^>]+class=["'][^"']*tgme_widget_message_wrap[^"']*["'][\s\S]*?(?=<div[^>]+class=["'][^"']*tgme_widget_message_wrap|</main>|$)/gi;

  const messages = [];
  let messageMatch;

  while (
  (messageMatch =
  messageRegex.exec(html)) !== null
  ) {
  messages.push(messageMatch[0]);
  }

  console.log(
  "Найдено блоков сообщений:",
  messages.length
  );

  /*

  * Telegram обычно отдаёт сообщения
  * от старых к новым.
  *
  * Поэтому начинаем с конца.
    */
    for (
    let i = messages.length - 1;
    i >= 0;
    i--
    ) {
    const message = messages[i];

    /*

    * Ищем фотографию внутри конкретного поста.
      */
      const photoRegex =
      /class=["'][^"']*tgme_widget_message_photo_wrap[^"']*["'][^>]*style=["'][^"']*background-image\s*:\s*url\(([^)]+)\)[^"']*["'][^>]*|style=["'][^"']*background-image\s*:\s*url\(([^)]+)\)[^"']*["'][^>]*class=["'][^"']*tgme_widget_message_photo_wrap[^"']*["']/gi;

    let photoMatch;

    while (
    (photoMatch =
    photoRegex.exec(message)) !== null
    ) {
    const rawUrl =
    photoMatch[1] ||
    photoMatch[2];

   
     const imageUrl =
         extractBackgroundImage(
             rawUrl
         );

     if (
         imageUrl &&
         /^https?:\/\//i.test(imageUrl)
     ) {
         images.push({
             url: imageUrl,
             message: message
         });

         break;
     }
   

    }

    /*

    * Иногда style и class расположены
    * в другом порядке.
    *
    * Поэтому дополнительный поиск.
      */
      if (
      !images.length ||
      images[images.length - 1].message !== message
      ) {
      const fallbackRegex =
      /<a[^>]+class=["'][^"']*tgme_widget_message_photo_wrap[^"']*["'][^>]*style=["']([^%22']+)["'][^>]*>/gi;

      let fallbackMatch;

      while (
      (fallbackMatch =
      fallbackRegex.exec(message)) !== null
      ) {
      const imageUrl =
      extractBackgroundImage(
      fallbackMatch[1]
      );

     
       if (
           imageUrl &&
           /^https?:\/\//i.test(imageUrl)
       ) {
           images.push({
               url: imageUrl,
               message: message
           });

           break;
       }
     

      }
      }

    /*

    * Нам нужна самая свежая фотография.
      */
      if (images.length > 0) {
      break;
      }
      }

  return images;
  }

/*

* Более надёжный общий поиск Telegram CDN.
*
* Это запасной вариант, если структура HTML
* немного изменилась.
  */
  function extractCdnImages(html) {
  const urls = [];

  const patterns = [
  /https://cdn\d+.telesco.pe/file/[^"'\\s<>]+/gi,
  /https://cdn\d+.telesco.pe/file/[^"'\\s<>]+.jpg/gi
  ];

  for (const pattern of patterns) {
  const matches =
  html.match(pattern);


   if (!matches) {
       continue;
   }

   for (const value of matches) {
       const url =
           decodeHtmlEntities(
               value
           );

       if (
           !urls.includes(url)
       ) {
           urls.push(url);
       }
   }
  

  }

  return urls;
  }

/*

* Загружает картинку.
  */
  async function downloadImage(imageUrl) {
  console.log(
  "Скачиваем изображение:",
  imageUrl
  );

  const response =
  await axios.get(
  imageUrl,
  {
  responseType:
  "arraybuffer",
  timeout: 30000,
  headers: {
  "User-Agent":
  HEADERS["User-Agent"],
  "Accept":
  "image/avif,image/webp,image/apng,image/jpeg,image/png,*/*;q=0.8",
  "Referer":
  "https://t.me/"
  },
  maxRedirects: 5
  }
  );

  const buffer =
  Buffer.from(
  response.data
  );

  if (!buffer.length) {
  throw new Error(
  "Telegram вернул пустое изображение"
  );
  }

  console.log(
  "Изображение загружено:",
  buffer.length,
  "bytes"
  );

  return buffer;
  }

/*

* Главная функция.
*
* Возвращает Buffer самой свежей
* фотографии из публичного канала.
  */
  async function getTelegramImage() {
  const html =
  await getTelegramHtml();

  /*

  * Сначала ищем фотографии
  * непосредственно внутри постов.
    */
    const postImages =
    extractPostImages(html);

  if (postImages.length > 0) {
  const image =
  postImages[0];

  
   console.log(
       "Свежая картинка найдена в посте:",
       image.url
   );

   return downloadImage(
       image.url
   );
 

  }

  /*

  * Резервный способ.
  *
  * Если Telegram немного поменял
  * HTML-разметку, пробуем найти
  * CDN-картинки напрямую.
    */
    console.log(
    "Фото поста стандартным способом не найдено."
    );

  const cdnImages =
  extractCdnImages(html);

  if (cdnImages.length > 0) {
  console.log(
  "Найдена CDN-картинка резервным способом:",
  cdnImages[0]
  );

 
   return downloadImage(
       cdnImages[0]
   );
  

  }

  throw new Error(
  "В последних постах Telegram не найдено изображение"
  );
  }

module.exports = {
getTelegramImage
};
