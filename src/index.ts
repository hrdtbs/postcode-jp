import pw from "playwright";
import http from "http";
import unzip from "unzipper";
import iconv from "iconv-lite";

const url = "http://zipcloud.ibsnet.co.jp";

const trimQuotes = (s: string) => s.slice(1).slice(0, -1);

const getData = async () => {
  const browser = await pw.chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  const handle = await page.$(
    "#LeftBox > div:nth-child(12) > div.dlButton > a"
  );
  if (handle === null) {
    throw new Error("no handle");
  }
  const href = await handle.getAttribute("href");
  await browser.close();
  const result: {
    [key: string]: any;
  } = {};
  await new Promise((resolve) => {
    http.get(`${url}${href}`, (response) => {
      response.pipe(unzip.Parse()).on("entry", function (entry) {
        entry
          .pipe(iconv.decodeStream("Shift_JIS"))
          .pipe(iconv.encodeStream("utf8"))
          .collect((_: Error, body: Buffer) => {
            body
              .toString()
              .split("\n")
              .forEach((s) => {
                const row = s.split(",");
                if (row.length === 1) return;
                const cityJisCode = row[0];
                const zipCode = trimQuotes(row[2]);
                const left = zipCode.slice(0, 3);
                result[left] = {
                  prefectureJisCode: cityJisCode.slice(0, 2),
                  cityJisCode,
                  zipCode,
                  prefectureNameKana: trimQuotes(row[3]),
                  cityNameKana: trimQuotes(row[4]),
                  townNameKana: trimQuotes(row[5]),
                  prefectureName: trimQuotes(row[6]),
                  cityName: trimQuotes(row[7]),
                  townName: trimQuotes(row[8]),
                };
              });
            resolve();
          });
      });
    });
  });
  console.log(result);
};

const run = async () => {
  await getData();
};

void run();
