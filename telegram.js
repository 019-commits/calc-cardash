const axios = require("axios");

const CHANNEL = "LoyaltySwift";

/**

* Получает самое свежее изображение из публичного Telegram-канала.
*
* Использует публичную страницу:
* https://t.me/s/LoyaltySwift
*
* Токен бота и Telegram-аккаунт не нужны.
  */
  async function getTelegramImage() {
  const channelUrl = `https://t.me/s/${CHANNEL}`;

  console.log(
  "Открываем Telegram:",
  channelUrl
  );

  const response = await axios.get(
  channelUrl,
  {
  timeout: 30000,
  headers: {
  "User-Agent":
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 " +
  "(KHTML, like Gecko) " +
  "Chrome/131.0 Safari/537.36",
  "Accept":
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
  }
  }
  );

  const html = String(response.data || "");

  console.log(
  "Telegram HTML получен:",
  html.length,
  "bytes"
  );

  /*

  * Ищем картинки Telegram.
  *
  * Telegram обычно хранит фотографию поста
  * внутри background-image:url(...)
    */
    const urls = [];

  const backgroundRegex =
  /background-image\s*:\s*url\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;

  let match;

  while (
  (match = backgroundRegex.exec(html)) !== null
  ) {
  if (match[1]) {
  urls.push(match[1]);
  }
  }

  console.log(
  "Картинок через background-image:",
  urls.length
  );

  /*

  * Дополнительно ищем прямые ссылки
  * на CDN Telegram.
    */
    const cdnRegex =
    /https?://cdn\d+.telesco.pe/file/[^"'<>\\s]+/gi;

  while (
  (match = cdnRegex.exec(html)) !== null
  ) {
  if (match[0]) {
  urls.push(match[0]);
  }
  }

  /*

  * Также проверяем og:image.
    */
    const ogPatterns = [
    /<meta[^>]+property=["']og:image[^>]+content=["']([^%22']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^%22']+)["'][^>]+property=["']og:image[^>]*>/i
    ];

  for (const pattern of ogPatterns) {
  const ogMatch = html.match(pattern);

 
   if (ogMatch && ogMatch[1]) {
       urls.push(ogMatch[1]);
   }
  

  }

  /*

  * Чистим ссылки.
    */
    const cleanUrls = urls
    .map((url) =>
    String(url)
    .replace(/&/g, "&")
    .replace(/\u0026/g, "&")
    .trim()
    )
    .filter((url) =>
    url.startsWith("http://") ||
    url.startsWith("https://")
    )
    .filter((url) =>
    url.includes("telesco.pe") ||
    url.includes("telegram")
    );

  /*

  * Убираем дубликаты.
    */
    const uniqueUrls = [
    ...new Set(cleanUrls)
    ];

  if (uniqueUrls.length === 0) {
  throw new Error(
  "Не удалось найти изображение в Telegram"
  );
  }

  /*

  * На странице /s/ посты идут от новых к старым.
  * Поэтому первая подходящая картинка обычно
  * относится к самому свежему посту.
  *
  * Однако выбираем первую найденную,
  * а не последнюю картинку страницы,
  * потому что один пост может содержать
  * несколько изображений.
    */
    const imageUrl = uniqueUrls[0];

  console.log(
  "Самая свежая найденная картинка:"
  );

  console.log(
  imageUrl
  );

  console.log(
  "Скачиваем изображение..."
  );

  const imageResponse =
  await axios.get(
  imageUrl,
  {
  responseType: "arraybuffer",
  timeout: 30000,
  maxContentLength:
  20 * 1024 * 1024,
  maxBodyLength:
  20 * 1024 * 1024,
  headers: {
  "User-Agent":
  "Mozilla/5.0",
  "Referer":
  channelUrl
  }
  }
  );

  const imageBuffer =
  Buffer.from(
  imageResponse.data
  );

  if (
  !imageBuffer ||
  imageBuffer.length === 0
  ) {
  throw new Error(
  "Telegram вернул пустое изображение"
  );
  }

  console.log(
  "Изображение загружено:",
  imageBuffer.length,
  "bytes"
  );

  /*

  * ВАЖНО:
  * Возвращаем именно Buffer,
  * потому что server.js передаёт его
  * непосредственно в recognizeRates().
    */
    return imageBuffer;
    }

module.exports = {
getTelegramImage
};
