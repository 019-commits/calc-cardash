const axios = require("axios");

const CHANNEL = "LoyaltySwift";

const USER_AGENT =
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
"AppleWebKit/537.36 (KHTML, like Gecko) " +
"Chrome/131.0 Safari/537.36";

function decodeHtml(value) {
return String(value)
.replace(/&/g, "&")
.replace(/"/g, '"')
.replace(/'/g, "'")
.replace(/</g, "<")
.replace(/>/g, ">");
}

/*

* Получаем публичную ленту канала.
  */
  async function getTelegramPage() {
  const url =
  "https://t.me/s/" + CHANNEL;

  console.log(
  "Открываем Telegram:",
  url
  );

  const response =
  await axios.get(
  url,
  {
  timeout: 30000,
  maxRedirects: 5,
  headers: {
  "User-Agent":
  USER_AGENT,
  "Accept":
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language":
  "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
  }
  }
  );

  const html =
  response.data;

  if (
  typeof html !== "string" ||
  html.length === 0
  ) {
  throw new Error(
  "Telegram не вернул HTML"
  );
  }

  console.log(
  "Telegram HTML получен:",
  html.length,
  "bytes"
  );

  return html;
  }

/*

* Ищем URL фотографий Telegram.
*
* Не используем сложные регулярки.
* Берём все background-image:url(...)
* из HTML и проверяем, что это CDN Telegram.
  */
  function findImageUrls(html) {
  const urls = [];

  const marker =
  "background-image:url(";

  let position = 0;

  while (true) {
  const start =
  html.indexOf(
  marker,
  position
  );

 
   if (start === -1) {
       break;
   }

   const urlStart =
       start + marker.length;

   let urlEnd =
       html.indexOf(
           ")",
           urlStart
       );

   if (urlEnd === -1) {
       break;
   }

   let value =
       html.substring(
           urlStart,
           urlEnd
       ).trim();

   value =
       value.replace(
           /^["']/,
           ""
       );

   value =
       value.replace(
           /["']$/,
           ""
       );

   value =
       decodeHtml(value);

   /*
    * Нас интересуют именно картинки
    * с Telegram CDN.
    */
   if (
       value.startsWith(
           "https://cdn"
       ) &&
       value.includes(
           ".telesco.pe/file/"
       )
   ) {
       if (
           !urls.includes(value)
       ) {
           urls.push(value);
       }
   }

   position =
       urlEnd + 1;
 

  }

  return urls;
  }

/*

* Дополнительный способ поиска:
* ищем прямые ссылки cdn*.telesco.pe/file/...
  */
  function findDirectCdnUrls(html) {
  const urls = [];

  const marker =
  "https://cdn";

  let position = 0;

  while (true) {
  const start =
  html.indexOf(
  marker,
  position
  );

 
   if (start === -1) {
       break;
   }

   const endCandidates = [
       html.indexOf('"', start),
       html.indexOf("'", start),
       html.indexOf("<", start),
       html.indexOf(" ", start),
       html.indexOf("\n", start)
   ].filter(
       value => value !== -1
   );

   if (
       endCandidates.length === 0
   ) {
       break;
   }

   const end =
       Math.min(
           ...endCandidates
       );

   let value =
       html.substring(
           start,
           end
       );

   value =
       decodeHtml(value);

   /*
    * Очищаем возможные хвосты.
    */
   value =
       value.replace(
           /[),;]+$/,
           ""
       );

   if (
       value.includes(
           ".telesco.pe/file/"
       )
   ) {
       if (
           !urls.includes(value)
       ) {
           urls.push(value);
       }
   }

   position =
       end + 1;
 

  }

  return urls;
  }

/*

* Скачиваем изображение.
  */
  async function downloadImage(url) {
  console.log(
  "Скачиваем изображение:"
  );

  console.log(url);

  const response =
  await axios.get(
  url,
  {
  responseType:
  "arraybuffer",
  timeout: 30000,
  maxRedirects: 5,
  headers: {
  "User-Agent":
  USER_AGENT,
  "Referer":
  "https://t.me/"
  }
  }
  );

  const buffer =
  Buffer.from(
  response.data
  );

  if (
  !buffer ||
  buffer.length === 0
  ) {
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
* найденной фотографии.
  */
  async function getTelegramImage() {
  const html =
  await getTelegramPage();

  /*

  * Сначала ищем background-image.
    */
    let images =
    findImageUrls(html);

  console.log(
  "Картинок через background-image:",
  images.length
  );

  /*

  * Если не нашли — ищем CDN напрямую.
    */
    if (
    images.length === 0
    ) {
    images =
    findDirectCdnUrls(
    html
    );

    console.log(
    "Картинок через прямой CDN поиск:",
    images.length
    );
    }

  if (
  images.length === 0
  ) {
  throw new Error(
  "В публичной ленте Telegram не найдено изображение"
  );
  }

  /*

  * Telegram отдаёт сообщения
  * в порядке от старых к новым.
  *
  * Поэтому берём последнюю найденную
  * картинку.
    */
    const latestImage =
    images[images.length - 1];

  console.log(
  "Самая свежая найденная картинка:"
  );

  console.log(
  latestImage
  );

  return downloadImage(
  latestImage
  );
  }

module.exports = {
getTelegramImage
};
