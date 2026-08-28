const axios = require("axios");

const CHANNEL = "LoyaltySwift";

async function getTelegramImage() {
const channelUrl =
`https://t.me/s/${CHANNEL}`;


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
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
            "Accept":
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
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
 * Telegram показывает посты
 * на странице /s/ от новых к старым.
 *
 * Сначала пытаемся найти блоки сообщений,
 * чтобы брать картинку именно из самого
 * свежего поста.
 */

const messageBlocks = [];

const messageRegex =
    /<div[^>]+class=["'][^"']*tgme_widget_message_wrap[^"']*["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/gi;

let blockMatch;

while (
    (blockMatch =
        messageRegex.exec(html)) !== null
) {
    messageBlocks.push(
        blockMatch[0]
    );
}

console.log(
    "Найдено блоков сообщений:",
    messageBlocks.length
);

/*
 * Сначала ищем изображение в блоках.
 */

for (
    const block of messageBlocks
) {
    const imageUrl =
        findImageInHtml(block);

    if (imageUrl) {
        return downloadImage(
            imageUrl
        );
    }
}

/*
 * Если структура Telegram изменилась,
 * используем запасной поиск по всей странице.
 */

const imageUrl =
    findImageInHtml(html);

if (!imageUrl) {
    throw new Error(
        "Не удалось найти изображение в Telegram"
    );
}

return downloadImage(
    imageUrl
);


}

function findImageInHtml(html) {
const urls = [];


/*
 * background-image:url(...)
 */
const backgroundRegex =
    /background-image\s*:\s*url\(\s*['"]?([^'")\s]+)['"]?\s*\)/gi;

let match;

while (
    (match =
        backgroundRegex.exec(html)) !== null
) {
    if (match[1]) {
        urls.push(match[1]);
    }
}

/*
 * Прямые CDN-ссылки Telegram.
 */
const cdnRegex =
    /https?:\/\/cdn\d+\.telesco\.pe\/file\/[^"'<>\\\s]+/gi;

while (
    (match =
        cdnRegex.exec(html)) !== null
) {
    if (match[0]) {
        urls.push(match[0]);
    }
}

/*
 * og:image.
 */
const ogPatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i
];

for (
    const pattern of ogPatterns
) {
    const ogMatch =
        html.match(pattern);

    if (
        ogMatch &&
        ogMatch[1]
    ) {
        urls.push(
            ogMatch[1]
        );
    }
}

/*
 * Чистим URL.
 */
const cleanUrls =
    urls
        .map(
            (url) =>
                String(url)
                    .replace(
                        /&amp;/g,
                        "&"
                    )
                    .replace(
                        /\\u0026/g,
                        "&"
                    )
                    .trim()
        )
        .filter(
            (url) =>
                url.startsWith(
                    "http://"
                ) ||
                url.startsWith(
                    "https://"
                )
        )
        .filter(
            (url) =>
                url.includes(
                    "telesco.pe"
                )
        );

const uniqueUrls =
    [
        ...new Set(
            cleanUrls
        )
    ];

if (
    uniqueUrls.length === 0
) {
    return null;
}

return uniqueUrls[0];


}

async function downloadImage(
imageUrl
) {
console.log(
"Найдена картинка:",
imageUrl
);


console.log(
    "Скачиваем изображение..."
);

const response =
    await axios.get(
        imageUrl,
        {
            responseType:
                "arraybuffer",
            timeout: 30000,
            maxContentLength:
                20 * 1024 * 1024,
            maxBodyLength:
                20 * 1024 * 1024,
            headers: {
                "User-Agent":
                    "Mozilla/5.0"
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

/*
 * ВАЖНО:
 * Возвращаем объект.
 *
 * server.js получает:
 * image.buffer
 * image.url
 */
return {
    buffer,
    url: imageUrl
};


}

module.exports = {
getTelegramImage
};
