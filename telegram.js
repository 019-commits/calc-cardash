```js
const axios = require("axios");

async function getTelegramImage(channel = "LoyaltySwift") {
    const telegramUrl =
        `https://t.me/${channel}/1344`;

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

    const html = response.data;

    const patterns = [
        /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
        /property=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
        /content=["']([^"']+)["'][^>]+property=["']twitter:image["']/i
    ];

    let imageUrl = null;

    for (const pattern of patterns) {
        const match = html.match(pattern);

        if (match?.[1]) {
            imageUrl = match[1];
            break;
        }
    }

    if (!imageUrl) {
        throw new Error(
            "Не удалось найти изображение в Telegram"
        );
    }

    imageUrl = imageUrl.replace(
        /&amp;/g,
        "&"
    );

    console.log(
        "Найдена картинка:",
        imageUrl
    );

    const imageResponse = await axios.get(
        imageUrl,
        {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        }
    );

    const buffer =
        Buffer.from(imageResponse.data);

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

    return {
        url: imageUrl,
        buffer
    };
}

module.exports = {
    getTelegramImage
};
```
