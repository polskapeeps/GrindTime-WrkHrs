# Grind Time(Work Hours)

A simple, browser-based time tracking application that helps you log your work hours, calculate earnings, and export timesheets.

## Features

- **Time Entry**: Log your work hours with start and end times
- **Earnings Calculation**: Automatically calculates earnings based on your hourly rate
- **Filterable History**: Filter your time entries by date range
- **Data Export**: Generate CSV data for easy export to spreadsheets
- **Local Storage**: All data is stored locally in your browser
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode**: Easy on the eyes with a dark color scheme

## Getting Started

### Installation

No installation required! This is a client-side only application that runs entirely in your web browser.

1. Clone or download this repository
2. Open `index.html` in any modern web browser
3. Start tracking your time!

Alternatively, you can access the live version at: [your-github-pages-url-here]

### Usage

1. **Set Your Hourly Rate**: Enter your hourly rate in the settings section and click "Save"
2. **Log Time**: Fill in the date, start time, end time, and optional description, then click "Add Entry"
3. **View History**: All your entries appear in the table below, sorted by date (newest first)
4. **Filter Entries**: Use the date filters to view entries within a specific time period
5. **Export Data**: Generate a CSV of your filtered entries for use in spreadsheets

## Data Privacy

All data is stored locally in your browser using localStorage. Nothing is sent to any server, so your time tracking data remains private to your device.

To clear all data, you can use your browser's developer tools to clear localStorage for this site.

## Customization

### Changing Colors

The application uses CSS variables for theming. You can modify the colors in the `styles.css` file:

```css
:root {
  --primary-bg: #212529;
  --secondary-bg: #343a40;
  /* Additional color variables... */
}
```

### Adding Features

The code is organized in a modular way to make it easy to add new features:

- `index.html` - Structure and UI elements
- `styles.css` - All styling and theming
- `script.js` - Application logic and functionality

## Browser Compatibility

Works with all modern browsers that support:
- ES6 JavaScript
- localStorage API
- CSS Grid and Flexbox

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with vanilla JavaScript, HTML, and CSS
- Icons from [source-of-icons-if-used]
- Inspired by the need for a simple, privacy-focused time tracking solution
