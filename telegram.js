const axios = require("axios");

const TELEGRAM_POST =
    "https://t.me/LoyaltySwift/1344";

async function getTelegramImage() {

    console.log(
        "Открываем Telegram:",
        TELEGRAM_POST
    );

    const response = await axios.get(
        TELEGRAM_POST,
        {
            timeout: 20000,

            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                    "AppleWebKit/537.36 " +
                    "(KHTML, like Gecko) " +
                    "Chrome/131.0 Safari/537.36"
            }
        }
    );

    const html = response.data;

    /*
     * Ищем изображение Telegram
     * внутри публичной страницы поста.
     */

    const patterns = [

        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,

        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,

        /<meta[^>]+property=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,

        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']twitter:image["']/i

    ];

    let imageUrl = null;

    for (const pattern of patterns) {

        const match = html.match(pattern);

        if (match && match[1]) {

            imageUrl = match[1];

            break;

        }

    }

    if (!imageUrl) {

        throw new Error(
            "Не удалось найти изображение в Telegram-посте"
        );

    }

    imageUrl =
        imageUrl
            .replace(/&amp;/g, "&");

    console.log(
        "Найдена картинка:",
        imageUrl
    );

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

    return Buffer.from(
        imageResponse.data
    );
}

module.exports = {
    getTelegramImage
};
