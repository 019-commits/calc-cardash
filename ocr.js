const Tesseract = require("tesseract.js");

async function recognizeText(imageBuffer) {

    console.log(
        "Начинаем OCR..."
    );

    const result =
        await Tesseract.recognize(
            imageBuffer,
            "eng+rus",
            {
                logger: info => {

                    if (
                        info.status === "recognizing text"
                    ) {

                        console.log(
                            "OCR:",
                            Math.round(
                                info.progress * 100
                            ) + "%"
                        );

                    }

                }
            }
        );

    const text =
        result.data.text || "";

    console.log(
        "========== OCR TEXT =========="
    );

    console.log(text);

    console.log(
        "==============================="
    );

    return text;
}

module.exports = {
    recognizeText
};
