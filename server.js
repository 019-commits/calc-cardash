const express = require("express");
const path = require("path");

const { getTelegramImage } = require("./telegram");
const { recognizeRates } = require("./ocr");

const app = express();

const PORT = process.env.PORT || 10000;

const TELEGRAM_CHANNEL =
    process.env.TELEGRAM_CHANNEL || "LoyaltySwift";

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

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


/*
 * GET /api/rates
 *
 * Возвращает текущие курсы.
 */
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
        source: "Telegram / LoyaltySwift",
        error: lastError
    });
});


/*
 * GET /api/update
 *
 * Ручное обновление курсов.
 */
app.get("/api/update", async (req, res) => {
    try {
        const result = await updateRates();

        res.json({
            success: true,
            result: result
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


/*
 * Обновление курсов.
 */
async function updateRates() {
    console.log(
        "Ищем последнюю картинку в Telegram..."
    );

    /*
     * Получаем картинку.
     *
     * telegram.js должен вернуть Buffer.
     */
    const image = await getTelegramImage(
        TELEGRAM_CHANNEL
    );

    if (!image) {
        throw new Error(
            "Не удалось получить изображение из Telegram"
        );
    }

    /*
     * Проверяем, что получили именно Buffer.
     */
    if (!Buffer.isBuffer(image)) {
        throw new Error(
            "telegram.js должен вернуть Buffer изображения"
        );
    }

    if (image.length === 0) {
        throw new Error(
            "Получено пустое изображение"
        );
    }

    console.log(
        "Изображение получено:",
        image.length,
        "bytes"
    );

    console.log(
        "Запускаем OCR..."
    );

    /*
     * Передаём Buffer напрямую в OCR.
     */
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
            "OCR не вернул объект с курсами"
        );
    }

    const keys =
        Object.keys(recognized);

    if (keys.length === 0) {
        throw new Error(
            "OCR не смог распознать ни одного курса"
        );
    }

    /*
     * Обновляем только распознанные значения.
     *
     * Если какой-то курс OCR не увидел,
     * старое значение сохраняется.
     */
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


/*
 * Автоматическое обновление.
 */
async function automaticUpdate() {
    try {
        await updateRates();

        console.log(
            "Курсы успешно обновлены"
        );
    } catch (error) {
        lastError = error.message;

        console.error(
            "Ошибка обновления:",
            error.message
        );
    }
}


/*
 * Запуск сервера.
 */
app.listen(PORT, () => {
    console.log(
        "Server started on port " + PORT
    );

    /*
     * Первое обновление сразу после запуска.
     */
    automaticUpdate();

    /*
     * Затем обновляем каждые 10 минут.
     */
    setInterval(
        automaticUpdate,
        10 * 60 * 1000
    );
});
```
