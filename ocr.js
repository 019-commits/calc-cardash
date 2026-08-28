const Tesseract = require("tesseract.js");

async function recognizeRates(imageBuffer) {

    console.log("OCR: начинаем распознавание...");

    const result = await Tesseract.recognize(
        imageBuffer,
        "rus+eng",
        {
            logger: info => {

                if (info.status) {
                    console.log(
                        `OCR: ${info.status} ${
                            info.progress
                                ? Math.round(info.progress * 100) + "%"
                                : ""
                        }`
                    );
                }

            }
        }
    );

    const text =
        result.data.text || "";

    console.log(
        "OCR TEXT:\n",
        text
    );

    return text;
}

module.exports = {
    recognizeRates
};