# FormExpo

![FormExpo Logo](icon128.png)

A Chrome extension that simplifies form data management by allowing you to export and import form data across websites.

## Features

- **Export Forms**: Save form data to JSON or XML files
- **Import Forms**: Auto-fill forms using previously exported data
- **Smart Matching**: Intelligently matches form fields using IDs, names, and positions
- **Privacy First**: All data stays in your browser - no external servers

## Installation from Chrome Web Store

1. Visit the [FormExpo Chrome Web Store page](https://chrome.google.com/webstore/detail/formexpo)
2. Click "Add to Chrome"
3. Click "Add extension" in the popup

## For Developers

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/formexpo.git
   cd formexpo
   ```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `formexpo` directory

### Project Structure

```
formexpo/
├── manifest.json     # Extension configuration
├── popup.html       # Extension popup UI
├── popup.js         # Main extension logic
├── background.js    # Background service worker
└── icons/          # Extension icons
```

### Development Workflow

1. Make your changes to the source files
2. Test locally:
   - Click the refresh icon on your extension card in `chrome://extensions/`
   - Click the extension icon to test the popup
   - Use Chrome DevTools for debugging:
     - Right-click the extension icon and select "Inspect popup" for popup debugging
     - Click "service worker" in chrome://extensions for background script debugging

3. Common test scenarios:
   - Export form data to both JSON and XML
   - Import data into forms with matching and non-matching field names
   - Test with various form field types (text, checkbox, radio, select)
   - Verify proper error handling with invalid import files

### Building for Production

1. Update version in `manifest.json`
2. Create a zip file:
   ```bash
   zip -r formexpo.zip * -x "*.git*" -x "*.md"
   ```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See [LICENSE](LICENSE) for details

---

For bugs and feature requests, please [create an issue](https://github.com/yourusername/formexpo/issues)
