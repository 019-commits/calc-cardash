const axios = require("axios");

const TELEGRAM_POST =
"https://t.me/LoyaltySwift/1344";

async function getTelegramImage() {


console.log(
    "Открываем Telegram:",
    TELEGRAM_POST
);


const response =
    await axios.get(
        TELEGRAM_POST,
        {
            timeout: 30000,

            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                    "AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) " +
                    "Chrome/131.0.0.0 Safari/537.36",

                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

                "Accept-Language":
                    "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
            },

            maxRedirects: 10
        }
    );


const html =
    String(response.data || "");


console.log(
    "Telegram HTML получен:",
    html.length,
    "bytes"
);


/*
 * Ищем изображение несколькими способами.
 */

const patterns = [

    /*
     * og:image
     */
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,

    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,


    /*
     * twitter:image
     */
    /<meta[^>]+property=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,

    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']twitter:image["'][^>]*>/i,


    /*
     * Любой telesco.pe URL внутри HTML.
     */
    /(https?:\/\/cdn\d+\.telesco\.pe\/file\/[^"'\\\s<>]+)/i,


    /*
     * URL без протокола.
     */
    /(\/\/cdn\d+\.telesco\.pe\/file\/[^"'\\\s<>]+)/i
];


let imageUrl = null;


for (
    const pattern of patterns
) {

    const match =
        html.match(pattern);


    if (
        match &&
        match[1]
    ) {

        imageUrl =
            match[1];

        console.log(
            "URL изображения найден способом:",
            pattern.toString()
        );

        break;
    }
}


/*
 * Дополнительный поиск:
 *
 * Telegram может экранировать URL.
 */

if (!imageUrl) {

    const escaped =
        html.match(
            /https?:\\\/\\\/cdn\d+\.telesco\.pe\\\/file\\\/[^"'\\\s<>]+/i
        );


    if (
        escaped &&
        escaped[0]
    ) {

        imageUrl =
            escaped[0]
                .replace(/\\\//g, "/");

        console.log(
            "URL изображения найден в экранированном виде"
        );
    }
}


if (!imageUrl) {

    /*
     * Последняя попытка:
     * ищем любую ссылку на .jpg/.jpeg/.png
     */

    const generic =
        html.match(
            /https?:\/\/[^"'\\\s<>]+\.(?:jpg|jpeg|png)(?:\?[^"'\\\s<>]*)?/i
        );


    if (
        generic &&
        generic[0]
    ) {

        imageUrl =
            generic[0];

        console.log(
            "Найдено изображение общим поиском"
        );
    }
}


if (!imageUrl) {

    console.error(
        "Telegram не вернул URL картинки."
    );

    console.error(
        "Размер HTML:",
        html.length
    );

    /*
     * Показываем начало HTML,
     * чтобы при необходимости понять,
     * что именно вернул Telegram.
     */

    console.error(
        html.substring(0, 2000)
    );

    throw new Error(
        "Не удалось найти изображение в Telegram"
    );
}


/*
 * Декодируем HTML-сущности.
 */

imageUrl =
    imageUrl
        .replace(/&amp;/g, "&")
        .replace(/&#x2F;/gi, "/")
        .replace(/\\u002F/g, "/")
        .replace(/\\\//g, "/");


/*
 * Если URL начинается с //,
 * добавляем https.
 */

if (
    imageUrl.startsWith("//")
) {

    imageUrl =
        "https:" +
        imageUrl;
}


console.log(
    "Найдена картинка:",
    imageUrl
);


/*
 * Загружаем сам файл.
 */

const imageResponse =
    await axios.get(
        imageUrl,
        {
            responseType: "arraybuffer",

            timeout: 30000,

            maxRedirects: 10,

            headers: {
                "User-Agent":
                    "Mozilla/5.0",

                "Referer":
                    TELEGRAM_POST
            }
        }
    );


const imageBuffer =
    Buffer.from(
        imageResponse.data
    );


if (
    !imageBuffer.length
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


return imageBuffer;


}

module.exports = {
getTelegramImage
};
