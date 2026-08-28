function normalizeText(text) {
    return String(text || "")
        .replace(/[ОO]/g, "0")
        .replace(/[З]/g, "3")
        .replace(/[ІI]/g, "1")
        .replace(/[Б]/g, "6")
        .replace(/[\,]/g, ".")
        .replace(/[−–—]/g, "-");
}

function numbers(text) {
    const matches =
        text.match(
            /\d+(?:\.\d{1,6})?/g
        );

    if (!matches) {
        return [];
    }

    return matches.map(
        Number
    );
}

function findNear(
    lines,
    keywords,
    validator
) {
    for (
        let i = 0;
        i < lines.length;
        i++
    ) {
        const line =
            lines[i].toLowerCase();

        const found =
            keywords.some(
                keyword =>
                    line.includes(keyword)
            );

        if (!found) {
            continue;
        }

        const area =
            [
                lines[i],
                lines[i + 1] || "",
                lines[i + 2] || "",
                lines[i + 3] || ""
            ].join(" ");

        const nums =
            numbers(
                normalizeText(area)
            );

        for (const value of nums) {
            if (validator(value)) {
                return value;
            }
        }
    }

    return null;
}

function parseRates(text) {
    const normalized =
        normalizeText(text);

    const lines =
        normalized
            .split(/\r?\n/)
            .map(
                line =>
                    line.trim()
            )
            .filter(Boolean);

    const result = {};

    /*
     * USD
     */
    const usd =
        findNear(
            lines,
            [
                "usd",
                "доллар",
                "долл",
                "сша"
            ],
            value =>
                value >= 50 &&
                value <= 150
        );

    if (usd !== null) {
        result.USD = usd;
    }

    /*
     * JPY
     */
    const jpy =
        findNear(
            lines,
            [
                "jpy",
                "япония",
                "иена",
                "иен"
            ],
            value =>
                value > 0 &&
                value < 10
        );

    if (jpy !== null) {
        result.JPY_SWIFT = jpy;
    }

    /*
     * CNY
     */
    const cny =
        findNear(
            lines,
            [
                "cny",
                "китай",
                "юань",
                "юан"
            ],
            value =>
                value > 1 &&
                value < 30
        );

    if (cny !== null) {
        result.CNY = cny;
    }

    /*
     * KRW
     */
    const krw =
        findNear(
            lines,
            [
                "krw",
                "корея",
                "корей"
            ],
            value =>
                value > 0 &&
                value < 1
        );

    if (krw !== null) {
        result.KRW = krw;
    }

    /*
     * THB
     */
    const thb =
        findNear(
            lines,
            [
                "thb",
                "таиланд",
                "бат"
            ],
            value =>
                value > 1 &&
                value < 10
        );

    if (thb !== null) {
        result.THB = thb;
    }

    /*
     * AED
     */
    const aed =
        findNear(
            lines,
            [
                "aed",
                "дирхам",
                "дирх"
            ],
            value =>
                value > 10 &&
                value < 40
        );

    if (aed !== null) {
        result.AED = aed;
    }

    /*
     * Если OCR не распознал
     * подписи валют, пробуем
     * определить значения просто
     * по диапазонам.
     */

    const allNumbers =
        numbers(normalized);

    if (
        result.USD === undefined
    ) {
        const value =
            allNumbers.find(
                n =>
                    n >= 70 &&
                    n <= 100
            );

        if (value !== undefined) {
            result.USD = value;
        }
    }

    if (
        result.CNY === undefined
    ) {
        const value =
            allNumbers.find(
                n =>
                    n >= 8 &&
                    n <= 20
            );

        if (value !== undefined) {
            result.CNY = value;
        }
    }

    if (
        result.KRW === undefined
    ) {
        const value =
            allNumbers.find(
                n =>
                    n >= 0.04 &&
                    n <= 0.15
            );

        if (value !== undefined) {
            result.KRW = value;
        }
    }

    if (
        result.JPY_SWIFT === undefined
    ) {
        const value =
            allNumbers.find(
                n =>
                    n >= 0.3 &&
                    n <= 1
            );

        if (value !== undefined) {
            result.JPY_SWIFT = value;
        }
    }

    if (
        result.THB === undefined
    ) {
        const value =
            allNumbers.find(
                n =>
                    n >= 1.5 &&
                    n <= 5
            );

        if (value !== undefined) {
            result.THB = value;
        }
    }

    return result;
}

module.exports = {
    parseRates
};
