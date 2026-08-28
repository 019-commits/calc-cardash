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

* Получаем HTML публичной ленты Telegram.
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

* Находим все Telegram CDN картинки
* в публичной ленте.
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

   const urlEnd =
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

* Запасной поиск CDN-ссылок.
  */
  function findDirectCdnUrls(html) {
  const urls = [];

  const regex =
  /https://cdn\d+.telesco.pe/file/[^"'<>\\s]+/gi;

  const matches =
  html.match(regex);

  if (!matches) {
  return urls;
  }

  for (
  const value of matches
  ) {
  const url =
  decodeHtml(
  value
  ).replace(
  /[),;]+$/,
  ""
  );

 
   if (
       !urls.includes(url)
   ) {
       urls.push(url);
   }
  

  }

  return urls;
  }

/*

* Загружаем изображение и ЯВНО
* возвращаем Buffer.
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

  console.log(
  "Проверка Buffer:",
  Buffer.isBuffer(buffer)
  );

  console.log(
  "Размер Buffer:",
  buffer.length,
  "bytes"
  );

  if (
  !Buffer.isBuffer(buffer)
  ) {
  throw new Error(
  "Не удалось создать Buffer изображения"
  );
  }

  if (
  buffer.length === 0
  ) {
  throw new Error(
  "Получено пустое изображение"
  );
  }

  return buffer;
  }

/*

* Главная функция.
*
* ВАЖНО:
* Возвращает именно Buffer.
  */
  async function getTelegramImage() {
  const html =
  await getTelegramPage();

  let images =
  findImageUrls(html);

  console.log(
  "Картинок через background-image:",
  images.length
  );

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

  * Последняя найденная картинка —
  * самая свежая среди отображённых
  * в ленте.
    */
    const latestImage =
    images[images.length - 1];

  console.log(
  "Самая свежая найденная картинка:"
  );

  console.log(
  latestImage
  );

  const buffer =
  await downloadImage(
  latestImage
  );

  /*

  * Финальная проверка перед return.
    */
    if (
    !Buffer.isBuffer(buffer)
    ) {
    throw new Error(
    "downloadImage не вернул Buffer"
    );
    }

  console.log(
  "Передаём Buffer в server.js:",
  buffer.length,
  "bytes"
  );

  return buffer;
  }

module.exports = {
getTelegramImage
};
