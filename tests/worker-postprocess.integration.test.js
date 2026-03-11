import test from "node:test";
import assert from "node:assert/strict";

import { postprocessTokenResults } from "../public/worker-lib.js";

const invoiceText = `UNIWERSYTET EKONOMICZNY we Wrocławiu

Data wystawienia: 2026-01-09
Data dostawy towaru / wykonania usługi: 2026-01-09
Faktura nr: FSN 09/26/01/072
Oryginał

SPRZEDAWCA:
Uniwersytet Ekonomiczny we Wrocławiu
ul. Komandorska 118/120, 53-345 Wrocław
NIP: PL8960006997
Santander Bank Polska S.A. 17 ODDZIAŁ we WROCŁAWIU
07 1090 2529 0000 0006 3400 0503

Sposób zapłaty:
Przelew

Termin płatności:
2026-01-15

NABYWCA: (28208)
BARDS.AI SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ
ul. Na Grobli 12 m.021
50-421 Wrocław
NIP: 8992913362

Lp. | Nazwa produktu | PKWIU | J.m. | Ilość | Cena Netto | Wartość Netto | Podatek VAT Kwota | Wartość Brutto
1 | Energia elektryczna za okres 11.12.-09.01.biuro nr 101 |  | kWh | 95 | 1,15 | 109,25 | 25,13 | 134,38
2 | Energia elektryczna za okres 11.12.-09.01.biuro nr 103 |  | kWh | 95 | 1,15 | 109,25 | 25,13 | 134,38

PLN:
RAZEM:
W tym:

Kwota Netto | Stawka Vat (%) | Kwota Vat | Kwota Brutto
218,50 |  | 50,26 | 268,76
218,50 | Podstawa 23% | 23,00% | 50,26 | 268,76

Do zapłaty: 268,76 PLN
Słownie: dwieście sześćdziesiąt osiem PLN i siedemdziesiąt sześć gr

Anna Koplin

Imię, nazwisko i podpis osoby uprawnionej do otrzymania faktury
Imię, nazwisko i podpis osoby uprawnionej do wystawienia faktury`;

function locate(text, fragment, fromIndex = 0) {
  const start = text.indexOf(fragment, fromIndex);
  assert.notEqual(start, -1, `Missing fragment in fixture: ${fragment}`);
  return {
    start,
    end: start + fragment.length,
    word: fragment,
  };
}

test("does not extend an entity through multiline whitespace into the next word", () => {
  const location = locate(invoiceText, "Wrocławiu");

  const rawResults = [
    {
      entity: "B-LOCATION",
      score: 0.99,
      index: 11,
      ...location,
    },
  ];

  const merged = postprocessTokenResults(rawResults, invoiceText);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].entity, "LOCATION");
  assert.equal(merged[0].word, "Wrocławiu");
  assert.equal(invoiceText.slice(merged[0].end, merged[0].end + 6), "\n\nData");
});

test("still merges adjacent same-entity tokens separated only by spaces", () => {
  const sellerLine = "Uniwersytet Ekonomiczny we Wrocławiu";
  const first = locate(sellerLine, "Uniwersytet");
  const second = locate(sellerLine, " Ekonomiczny", first.end);
  const third = locate(sellerLine, " we", second.end);
  const fourth = locate(sellerLine, " Wrocławiu", third.end);

  const rawResults = [
    {
      entity: "B-ORGANIZATION_NAME",
      score: 0.93,
      index: 20,
      ...first,
    },
    {
      entity: "I-ORGANIZATION_NAME",
      score: 0.95,
      index: 21,
      start: second.start + 1,
      end: second.end,
      word: "Ekonomiczny",
    },
    {
      entity: "I-ORGANIZATION_NAME",
      score: 0.88,
      index: 22,
      start: third.start + 1,
      end: third.end,
      word: "we",
    },
    {
      entity: "I-ORGANIZATION_NAME",
      score: 0.92,
      index: 23,
      start: fourth.start + 1,
      end: fourth.end,
      word: "Wrocławiu",
    },
  ];

  const merged = postprocessTokenResults(rawResults, sellerLine);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].entity, "ORGANIZATION_NAME");
  assert.equal(merged[0].word, "Uniwersytet Ekonomiczny we Wrocławiu");
});
