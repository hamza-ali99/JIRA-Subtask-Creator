/**
 * Utility to update cookies in config.js
 * Usage: node utils/updateCookies.js "paste-your-cookies-here"
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'cli', 'config.js');

function updateCookies(newCookies) {
  if (!newCookies) {
    console.log(`
JIRA Cookie Updater

Usage: node utils/updateCookies.js "your-cookies-string"

How to get cookies:
  1. Open JIRA in your browser (make sure you're logged in)
  2. Open DevTools (F12) → Network tab
  3. Refresh the page
  4. Click any request to your JIRA instance
  5. Go to Headers → Request Headers
  6. Copy the entire "Cookie" header value
  7. Run: node utils/updateCookies.js "paste-here"

Essential cookies to include:
  - tenant.session.token (authentication)
  - atlassian.xsrf.token (CSRF protection)
  - atlassian.account.xsrf.token (account verification)

Note: Cookies typically expire after 8 hours of inactivity.
`);
    process.exit(1);
  }

  // Read the config file
  let configContent = fs.readFileSync(configPath, 'utf-8');

  // Replace the COOKIES value
  const cookieRegex = /COOKIES:\s*`[^`]*`/;
  const newCookieValue = `COOKIES: \`${newCookies.trim()}\``;
  
  if (cookieRegex.test(configContent)) {
    configContent = configContent.replace(cookieRegex, newCookieValue);
  } else {
    console.error('Could not find COOKIES in config.js');
    process.exit(1);
  }

  // Write back
  fs.writeFileSync(configPath, configContent);
  console.log('✅ Cookies updated in cli/config.js');
  console.log('   Remember: cookies expire after ~8 hours of inactivity');
}

// Get cookie string from command line
const cookieArg = process.argv[2];
updateCookies(cookieArg);
