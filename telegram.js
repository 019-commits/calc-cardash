const axios = require("axios");

const TELEGRAM_IMAGE_URL =
    process.env.TELEGRAM_IMAGE_URL || "";

async function downloadTelegramImage() {

    if (!TELEGRAM_IMAGE_URL) {
        throw new Error(
            "TELEGRAM_IMAGE_URL не задан"
        );
    }

    const response = await axios.get(
        TELEGRAM_IMAGE_URL,
        {
            responseType: "arraybuffer",
            timeout: 20000
        }
    );

    return Buffer.from(response.data);
}

module.exports = {
    downloadTelegramImage
};