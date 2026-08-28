const FALLBACK_RATES = {
USD: 87.20,
USD_IDUBID: 88.70,

```
JPY_SWIFT: 0.5530,
JPY_INTERNAL: 0.5530,
JPY_AFA_CASH: 0.5580,
JPY_AFA_QR: 0.5580,

CNY: 13.15,
KRW: 0.0636,
THB: 2.70,
AED: 23.50


};

async function loadRates() {
try {
const response =
await fetch(
"/api/rates",
{
cache: "no-store"
}
);


    if (!response.ok) {
        throw new Error(
            "HTTP " +
            response.status
        );
    }

    const data =
        await response.json();

    if (
        data &&
        data.success &&
        data.rates
    ) {
        return data.rates;
    }

    throw new Error(
        "Сервер не вернул курсы"
    );

} catch (error) {
    console.error(
        "Ошибка загрузки курсов:",
        error
    );

    return {
        ...FALLBACK_RATES
    };
}


}

if (
typeof window !==
"undefined"
) {
window.loadRates =
loadRates;


window.FALLBACK_RATES =
    FALLBACK_RATES;


}

if (
typeof module !==
"undefined"
) {
module.exports = {
FALLBACK_RATES,
loadRates
};
}
