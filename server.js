const express = require("express");
const path = require("path");

const { getTelegramImage } = require("./telegram");
const { recognizeRates } = require("./ocr");

const app = express();

const PORT = process.env.PORT || 10000;
const TELEGRAM_CHANNEL =
    process.env.TELEGRAM_CHANNEL || "LoyaltySwift";

let currentRates = {
    USD: 87.20,
    USD_IDUBID: 88.70,
    JPY_SWIFT: 0.5530,
    JPY_INTERNAL: 0.5530,
    JPY_AFA_CASH: 0.5580,
    JPY_AFA_QR: 0.5580,
    CNY: 13.15,
    KRW: 0.0636,
    THB: 2.70,
    AED: 23.50
};

let lastUpdate = null;
let lastImage = null;
let lastPost = null;
let lastError = null;

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

app.get("/api/rates", (req, res) => {
    res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
    );

    res.json({
        success: true,
        rates: currentRates,
        updatedAt: lastUpdate,
        image: lastImage,
        post: lastPost,
        source: "Telegram / " + TELEGRAM_CHANNEL,
        error: lastError
    });
});

app.get("/api/update", async (req, res) => {
    try {
        const result = await updateRates();

        res.json({
            success: true,
            result
        });
    } catch (error) {
        console.error(
            "Ошибка ручного обновления:",
            error
        );

        lastError = error.message;

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

async function updateRates() {
    console.log("");
    console.log("=================================");
    console.log("Обновление курсов");
    console.log("=================================");

    const telegram = await getTelegramImage(
        TELEGRAM_CHANNEL
    );

    if (!telegram) {
        throw new Error(
            "Telegram не вернул данные"
        );
    }

    if (!telegram.buffer) {
        throw new Error(
            "Telegram не вернул Buffer изображения"
        );
    }

    console.log(
        "Пост Telegram:",
        telegram.postUrl
    );

    console.log(
        "Изображение:",
        telegram.imageUrl
    );

    console.log(
        "Размер:",
        telegram.buffer.length,
        "bytes"
    );

    const recognized =
        await recognizeRates(
            telegram.buffer
        );

    console.log(
        "Распознанные курсы:",
        recognized
    );

    if (
        !recognized ||
        Object.keys(recognized).length === 0
    ) {
        throw new Error(
            "OCR не смог распознать курсы"
        );
    }

    currentRates = {
        ...currentRates,
        ...recognized
    };

    lastUpdate =
        new Date().toISOString();

    lastImage =
        telegram.imageUrl;

    lastPost =
        telegram.postUrl;

    lastError = null;

    console.log(
        "Курсы успешно обновлены"
    );

    console.log(
        currentRates
    );

    return {
        rates: currentRates,
        updatedAt: lastUpdate,
        image: lastImage,
        post: lastPost
    };
}

async function automaticUpdate() {
    try {
        await updateRates();
    } catch (error) {
        lastError =
            error.message;

        console.error(
            "Ошибка автоматического обновления:",
            error.message
        );
    }
}

app.listen(PORT, () => {
    console.log(
        "Server started on port " + PORT
    );

    console.log(
        "Telegram channel:",
        TELEGRAM_CHANNEL
    );

    automaticUpdate();

    setInterval(
        automaticUpdate,
        10 * 60 * 1000
    );
});
