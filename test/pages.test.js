import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../server.js";

const pages = [
  ["index.html", "LifeTime — India's Financial Exchange", "Your complete", false],
  ["loans.html", "Loans | LifeTime", "Personal loans", true],
  ["insurance.html", "Insurance | LifeTime", "Health insurance", true],
  ["investments.html", "Investments | LifeTime", "Understand risk", true],
  ["wealth-solutions.html", "Wealth Solutions | LifeTime", "Set your priorities", true]
];

let server;
let baseUrl;

before(async () => {
  server = createApp({ sendMail: async () => ({ accepted: [] }) }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

for (const [page, title, content, hasInterestLink] of pages) {
  test(`serves the ${title} service page`, async () => {
    const response = await fetch(`${baseUrl}/${page}`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, new RegExp(`<title>${title}</title>`));
    assert.ok(html.includes(content));
    if (hasInterestLink) {
      assert.ok(html.includes('href="index.html?interest='));
    }
  });
}
