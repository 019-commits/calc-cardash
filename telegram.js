const axios = require("axios");

function decodeHtml(text) {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

function extractPosts(html, channel) {
    const posts = [];

    const postRegex =
        /<div[^>]*class="[^"]*tgme_widget_message[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi;

    const blocks =
        html.match(postRegex) || [];

    for (const block of blocks) {
        const dateMatch =
            block.match(
                /<time[^>]+datetime="([^"]+)"/i
            );

        const hrefMatches =
            block.match(
                new RegExp(
                    "https://t\\.me/" +
                    channel +
                    "/[0-9]+",
                    "gi"
                )
            );

        let postUrl = null;

        if (
            hrefMatches &&
            hrefMatches.length
        ) {
            postUrl =
                hrefMatches[
                    hrefMatches.length - 1
                ];
        }

        const imageMatches =
            block.match(
                /https:\/\/cdn\d+\.telesco\.pe\/file\/[^"'<>\\\s]+/gi
            );

        if (
            !imageMatches ||
            !imageMatches.length
        ) {
            continue;
        }

        const imageUrl =
            decodeHtml(
                imageMatches[
                    imageMatches.length - 1
                ]
            );

        posts.push({
            imageUrl,
            postUrl,
            date: dateMatch
                ? dateMatch[1]
                : null
        });
    }

    return posts;
}

async function getTelegramImage(
    channel
) {
    const telegramUrl =
        "https://t.me/s/" +
        encodeURIComponent(channel);

    console.log(
        "Открываем Telegram:",
        telegramUrl
    );

    const response =
        await axios.get(
            telegramUrl,
            {
                timeout: 30000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
                    "Accept-Language":
                        "ru-RU,ru;q=0.9,en;q=0.8"
                }
            }
        );

    const html =
        String(response.data);

    console.log(
        "Telegram HTML получен:",
        html.length,
        "bytes"
    );

    const posts =
        extractPosts(
            html,
            channel
        );

    console.log(
        "Найдено постов с картинками:",
        posts.length
    );

    if (!posts.length) {
        throw new Error(
            "В публичной ленте Telegram не найдено изображение"
        );
    }

    /*
     * Последний найденный пост
     * находится в конце публичной ленты.
     */
    const latest =
        posts[posts.length - 1];

    console.log(
        "Самый свежий пост:",
        latest.postUrl
    );

    console.log(
        "Картинка:",
        latest.imageUrl
    );

    const imageResponse =
        await axios.get(
            latest.imageUrl,
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

    const buffer =
        Buffer.from(
            imageResponse.data
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

    return {
        buffer,
        imageUrl:
            latest.imageUrl,
        postUrl:
            latest.postUrl,
        date:
            latest.date
    };
}

module.exports = {
    getTelegramImage
};
