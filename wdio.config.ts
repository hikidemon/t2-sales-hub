export default {
  runner: 'local',
  specs: ['e2e/home.spec.ts'],
  capabilities: [{
    browserName: 'chrome',
    'goog:chromeOptions': {
      args: ['--headless', '--disable-gpu', '--no-sandbox', '--window-size=1280,800']
    }
  }],
  framework: 'mocha',
  mochaOpts: {
    timeout: 30000,
    reporter: 'spec'
  }
};
