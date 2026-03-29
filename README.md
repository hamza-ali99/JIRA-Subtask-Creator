# JIRA Subtask Creator

Automate the creation of JIRA stories and subtasks from test cases. Includes both a **web interface** and a **CLI tool**.

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)

## Features

### Web Interface
- **CSV Import**: Upload or paste CSV files with test cases
- **Manual Entry**: Add test cases one at a time
- **Two Creation Modes**:
  - Create a new Story with all test cases as subtasks
  - Add subtasks to an existing Story
- **Settings Page**: Configure all JIRA settings with live data fetching
- **History Tracking**: View recently created issues
- **Cookie Authentication**: Use your JIRA session cookies for authentication
- **Privacy-Focused**: All data stored in browser localStorage only

### CLI Tool
- **Quick automation**: Run from terminal for batch operations
- **Flexible options**: Create stories or add to existing issues
- **Minimal setup**: Just configure once and run

## Screenshots

> Add screenshots of your running application here

## Prerequisites

- Node.js 18.17 or later
- A JIRA Cloud instance with API access
- Browser cookies from an authenticated JIRA session

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/jira-subtask-creator.git
cd jira-subtask-creator

# Install dependencies (for web interface)
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### CLI Setup

The CLI tool in `cli/` folder requires no additional installation (uses Node.js built-in fetch).

```bash
# 1. Edit cli/config.js with your JIRA settings
# 2. Update cookies
node utils/updateCookies.js "paste-your-cookies-here"

# 3. Run the CLI
node cli/index.js --help
node cli/index.js --createStory "My Feature Tests"
node cli/index.js --parentId 123456 --csv ./tests.csv
```

## Configuration

### 1. Get Your JIRA Cookies

1. Log in to your JIRA Cloud instance
2. Open DevTools (F12) → Network tab
3. Refresh the page
4. Click any request → Headers → Copy the `Cookie` header value
5. Paste into the application's Cookie Manager

### 2. Configure JIRA Settings

Navigate to the Settings page and configure:

| Setting | Description | Example |
|---------|-------------|---------|
| JIRA URL | Your Atlassian Cloud URL | `https://your-company.atlassian.net` |
| Project ID | Numeric project identifier | `10001` |
| Project Key | Project abbreviation | `PROJ` |
| Story Type ID | Issue type ID for stories | `10001` |
| Subtask Type ID | Issue type ID for subtasks | `10003` |
| Epic ID | Parent epic for new stories | `12345` |
| Sprint ID | Target sprint | `1234` |
| Board ID | For fetching sprints | `123` |
| Assignee | Default assignee account ID | Search via UI |

**Finding these values:**
- Use the "Fetch" buttons in Settings to load data from your JIRA instance
- Check issue URLs for Epic/Story IDs (the numeric part)
- Use browser DevTools Network tab to inspect API responses

### Custom Fields (Optional)

Custom field IDs vary between JIRA instances. If issues aren't linking to Epics or Sprints, you may need to configure:

- **Epic Link Field**: e.g., `customfield_10014`
- **Sprint Field**: e.g., `customfield_10020`

Leave these blank if not needed - the app will skip them automatically.

## CSV Format

Your CSV file should have headers like:

```csv
TestCase ID,Title,Priority,Status
TC-001,Verify login with valid credentials,High,Draft
├── cli/                      # CLI tool (standalone Node.js)
│   ├── config.js             # CLI configuration
│   ├── index.js              # CLI entry point
│   ├── csvParser.js          # CSV parsing logic
│   ├── jiraClient.js         # JIRA API client
│   └── TestCases.csv         # Sample test cases
├── utils/                    # Utility scripts
│   ├── updateCookies.js      # Cookie updater
│   └── getIssueTypes.js      # Fetch JIRA issue types
├── reference/                # API documentation
│   └── api-payloads.js       # Example payloads
├── public/                   # Static assets
├── src/                      # Web interface (Next.js)
│   ├── app/
│   │   ├── api/
│   │   │   ├── create-issues/
│   │   │   ├── jira-metadata/
│   │   │   └── test-connection/
│   │   ├── settings/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── CookieManager.tsx
│   │   ├── CsvDropZone.tsx
│   │   ├── HistoryPanel.tsx
│   │   ├── IssueForm.tsx
│   │   ├── ResultsModal.tsx
│   │   ├── SettingsDropdown.tsx
│   │   └── TestCasePreview.tsx
│   └── lib/
│       ├── config.ts
│       ├── jira-client.ts
│       └── types.ts
├── TestCases.csv             # Sample test cases
└── package.json
│   ├── settings/             # Settings page
│   ├── layout.tsx
│   └── page.tsx              # Main page
├── components/
│   ├── CookieManager.tsx     # Auth management
│   ├── CsvDropZone.tsx       # CSV upload/paste/manual entry
│   ├── HistoryPanel.tsx      # Recent activity
│   ├── IssueForm.tsx         # Creation mode selection
│   ├── ResultsModal.tsx      # Success/error display
│   ├── SettingsDropdown.tsx  # Quick settings view
│   └── TestCasePreview.tsx   # Test case table
└── lib/
    ├── config.ts             # Default settings
    ├── jira-client.ts        # JIRA API wrapper
    └── types.ts              # TypeScript interfaces
```

## Security Notes

- **No backend storage**: All settings stored in browser localStorage
- **No credentials saved**: Only session cookies (which expire)
- **Proxy pattern**: API calls go through Next.js routes to avoid CORS
- **Cookie expiry warning**: Alerts when cookies may need refreshing

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npx tsc --noEmit

# Lint
npm run lint
```

## Deployment

This is a Next.js app that can be deployed to:
- Vercel (recommended)
- Any Node.js hosting platform
- Docker container

**Note**: Since this app uses cookie-based auth, it's designed for personal/team use rather than public deployment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this for your own projects.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Uses [JIRA Cloud REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
