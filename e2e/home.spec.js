const { expect } = require('@wdio/testing');

describe('HomePage E2E', () => {
  let browser;

  beforeAll(() => {
    browser = require('@wdio/browser-runner').browsers.chrome;
  });

  describe('HomePage', () => {
    it('should load without errors', async () => {
      await browser.url('http://localhost:5173/');
      await browser.waitUntil(() => browser.executeScript('document.readyState === "complete"'), 5000);
      await expect(browser).to.have.title(/T2 Sales Hub/);
      await expect(browser).to.containText('Общий доход');
      await expect(browser).to.containText('Динамика продаж');
      await expect(browser).to.containText('Рейтинг продавцов');
    });

    it('should have T2 logo', async () => {
      await browser.url('http://localhost:5173/');
      await expect(browser).to.containText('T2');
    });

    it('should have navigation elements', async () => {
      await browser.url('http://localhost:5173/');
      await expect(browser).to.have.elementLocated('//button[contains(text(), "Дашборд")]');
      await expect(browser).to.have.elementLocated('//button[contains(text(), "График")]');
      await expect(browser).to.have.elementLocated('//button[contains(text(), "Планы")]');
      await expect(browser).to.have.elementLocated('//button[contains(text(), "Профиль")]');
    });

    it('should have stats and charts', async () => {
      await browser.url('http://localhost:5173/');
      await expect(browser).to.containText('50 000 ₽');
      await expect(browser).to.containText('750 ₽');
    });

    it('should have user profile section', async () => {
      await browser.url('http://localhost:5173/');
      await expect(browser).to.containText('Продавец');
      await expect(browser).to.containText('seller');
    });

    it('should have logout button', async () => {
      await browser.url('http://localhost:5173/');
      await expect(browser).to.have.elementLocated('//button[contains(@title, "Выйти")]');
    });
  });
});
