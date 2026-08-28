const axios = require("axios");

/*

* Получает картинку из Telegram-поста.
*
* Возвращает:
*
* {
* 
  buffer: Buffer,
 
* 
  url: string

* }
  */
  async function getTelegramImage(channel) {
  const telegramUrl =
  channel
  ? `https://t.me/${channel}/1344`
  : "https://t.me/LoyaltySwift/1344";

  console.log(
  "Открываем Telegram:",
  telegramUrl
  );

  const response = await axios.get(
  telegramUrl,
  {
  timeout: 30000,


       headers: {
           "User-Agent":
               "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
               "AppleWebKit/537.36 " +
               "(KHTML, like Gecko) " +
               "Chrome/131.0 Safari/537.36"
       }
   }


  );

  const html =
  response.data;

  /*

  * Ищем og:image.
    */
    const patterns = [
    /property=["']og:image[^>]+content=["']([^%22']+)["']/i,

    /content=["']([^%22']+)["'][^>]+property=["']og:image/i,

    /property=["']twitter:image[^>]+content=["']([^%22']+)["']/i,

    /content=["']([^%22']+)["'][^>]+property=["']twitter:image/i
    ];

  let imageUrl = null;

  for (const pattern of patterns) {
  const match =
  html.match(pattern);

 
   if (
       match &&
       match[1]
   ) {
       imageUrl =
           match[1];

       break;
   }
 

  }

  if (!imageUrl) {
  throw new Error(
  "Не удалось найти изображение в Telegram"
  );
  }

  /*

  * HTML entities.
    */
    imageUrl =
    imageUrl
    .replace(/&/g, "&");

  console.log(
  "Найдена картинка:",
  imageUrl
  );

  /*

  * Скачиваем изображение.
    */
    const imageResponse =
    await axios.get(
    imageUrl,
    {
    responseType:
    "arraybuffer",

  
         timeout: 30000,

         headers: {
             "User-Agent":
                 "Mozilla/5.0"
         }
     }
  

    );

  const imageBuffer =
  Buffer.from(
  imageResponse.data
  );

  if (
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

  return {
  buffer: imageBuffer,
  url: imageUrl
  };
  }

module.exports = {
getTelegramImage
};
