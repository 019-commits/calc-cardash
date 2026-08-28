const Tesseract =
    require("tesseract.js");

const sharp =
    require("sharp");

const {
    parseRates
} = require("./rates");

async function runTesseract(
    buffer,
    psm
) {
    console.log(
        "Запускаем Tesseract, PSM:",
        psm
    );

    const result =
        await Tesseract.recognize(
            buffer,
            "eng+rus",
            {
                logger: message => {
                    if (
                        message.status ===
                        "recognizing text"
                    ) {
                        const percent =
                            Math.round(
                                (message.progress || 0) *
                                100
                            );

                        console.log(
                            "OCR:",
                            percent + "%"
                        );
                    }
                },
                config: {
                    tessedit_pageseg_mode:
                        String(psm)
                }
            }
        );

    return result.data.text || "";
}

async function recognizeRates(
    originalBuffer
) {
    console.log(
        "Подготавливаем изображение для OCR..."
    );

    const metadata =
        await sharp(
            originalBuffer
        ).metadata();

    console.log(
        "Размер картинки:",
        metadata.width,
        "x",
        metadata.height
    );

    /*
     * Увеличиваем картинку.
     */
    const enlarged =
        await sharp(
            originalBuffer
        )
            .resize({
                width:
                    Math.max(
                        1600,
                        metadata.width || 1600
                    ),
                withoutEnlargement:
                    false
            })
            .sharpen()
            .normalize()
            .png()
            .toBuffer();

    /*
     * Чёрно-белая версия.
     */
    const grayscale =
        await sharp(
            originalBuffer
        )
            .resize({
                width: 2000,
                withoutEnlargement: false
            })
            .grayscale()
            .normalize()
            .sharpen()
            .png()
            .toBuffer();

    /*
     * Запускаем несколько режимов.
     */
    const texts = [];

    try {
        texts.push(
            await runTesseract(
                enlarged,
                6
            )
        );
    } catch (error) {
        console.error(
            "OCR PSM 6:",
            error.message
        );
    }

    try {
        texts.push(
            await runTesseract(
                enlarged,
                11
            )
        );
    } catch (error) {
        console.error(
            "OCR PSM 11:",
            error.message
        );
    }

    try {
        texts.push(
            await runTesseract(
                grayscale,
                6
            )
        );
    } catch (error) {
        console.error(
            "OCR grayscale:",
            error.message
        );
    }

    console.log(
        "========== OCR TEXT =========="
    );

    for (const text of texts) {
        console.log(text);
    }

    console.log(
        "==============================="
    );

    /*
     * Объединяем результаты.
     */
    const combined =
        texts.join("\n");

    const rates =
        parseRates(combined);

    console.log(
        "========== RECOGNIZED RATES =========="
    );

    console.log(rates);

    console.log(
        "======================================="
    );

    return rates;
}

module.exports = {
    recognizeRates
};
