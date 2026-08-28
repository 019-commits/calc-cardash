const express = require("express");
const path = require("path");

const { getTelegramImage } = require("./telegram");
const { recognizeRates } = require("./ocr");

const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

const TELEGRAM_CHANNEL =
    process.env.TELEGRAM_CHANNEL ||
    "LoyaltySwift";

const FALLBACK_RATES = {
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

let currentRates = {
    ...FALLBACK_RATES
};

let lastUpdate = null;
let lastImage = null;
let lastError = null;

app.get(
    "/api/rates",
    async (req, res) => {

        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate"
        );

        res.json({
            success: true,
            rates: currentRates,
            updatedAt: lastUpdate,
            image: lastImage,
            source: "Telegram / LoyaltySwift",
            error: lastError
        });
    }
);

app.get(
    "/api/update",
    async (req, res) => {

        try {

            const result =
                await updateRates();

            res.json({
                success: true,
                result
            });

        } catch (error) {

            console.error(
                "Ошибка ручного обновления:",
                error
            );

            lastError =
                error.message;

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

async function updateRates() {

    console.log(
        "Ищем последнюю картинку в Telegram..."
    );

    const image =
        await getTelegramImage();

    if (!image) {
        throw new Error(
            "Не удалось загрузить картинку из Telegram"
        );
    }

    console.log(
        "Картинка из Telegram загружена:",
        image.length,
        "bytes"
    );

    console.log(
        "Запускаем OCR..."
    );

    const recognized =
        await recognizeRates(image);

    console.log(
        "OCR результат:"
    );

    console.log(
        recognized
    );

    if (
        !recognized ||
        typeof recognized !== "object"
    ) {
        throw new Error(
            "OCR не вернул результат"
        );
    }

    const recognizedKeys =
        Object.keys(recognized);

    if (
        recognizedKeys.length === 0
    ) {
        throw new Error(
            "OCR не смог распознать ни одного курса"
        );
    }

    currentRates = {
        ...currentRates,
        ...recognized
    };

    lastUpdate =
        new Date().toISOString();

    lastError = null;

    console.log(
        "Курсы успешно обновлены:"
    );

    console.log(
        currentRates
    );

    return {
        rates: currentRates,
        updatedAt: lastUpdate
    };
}

async function automaticUpdate() {

    try {

        await updateRates();

        console.log(
            "Курсы успешно обновлены"
        );

    } catch (error) {

        lastError =
            error.message;

        console.error(
            "Ошибка обновления:",
            error.message
        );
    }
}

app.listen(
    PORT,
    () => {

        console.log(
            "Server started on port " + PORT
        );

        automaticUpdate();

        setInterval(
            automaticUpdate,
            10 * 60 * 1000
        );
    }
);
```
