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


/*
=========================================================
 НАСТРОЙКИ
=========================================================
*/

const TELEGRAM_CHANNEL =
    process.env.TELEGRAM_CHANNEL ||
    "LoyaltySwift";


/*
=========================================================
 FALLBACK
=========================================================
*/

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


/*
=========================================================
 API / RATES
=========================================================
*/

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

            source:
                "Telegram / LoyaltySwift",

            error: lastError

        });

    }
);


/*
=========================================================
 ОБНОВЛЕНИЕ
=========================================================
*/

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

            console.error(error);

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);


/*
=========================================================
 UPDATE RATES
=========================================================
*/

async function updateRates() {

    console.log(
        "Ищем последнюю картинку в Telegram..."
    );


    const image =
        await getTelegramImage(
            TELEGRAM_CHANNEL
        );


    if (!image) {

        throw new Error(
            "Не удалось найти картинку в Telegram"
        );

    }


    console.log(
        "Найдена картинка:"
    );

    console.log(
        image.url
    );


    console.log(
        "Запускаем OCR..."
    );


    const recognized =
        await recognizeRates(
            image.url
        );


    console.log(
        "OCR результат:"
    );

    console.log(
        recognized
    );


    /*
    Не заменяем весь объект,
    если OCR что-то не распознал.
    */

    currentRates = {

        ...currentRates,

        ...recognized

    };


    lastUpdate =
        new Date().toISOString();


    lastImage =
        image.url;


    lastError =
        null;


    return {

        rates:
            currentRates,

        image:
            image.url,

        updatedAt:
            lastUpdate

    };

}


/*
=========================================================
 АВТООБНОВЛЕНИЕ
=========================================================
*/

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


/*
=========================================================
 START
=========================================================
*/

app.listen(
    PORT,
    () => {

        console.log(
            `Server started on port ${PORT}`
        );


        /*
        Первая загрузка.
        */

        automaticUpdate();


        /*
        Потом каждые 10 минут.
        */

        setInterval(

            automaticUpdate,

            10 * 60 * 1000

        );

    }
);