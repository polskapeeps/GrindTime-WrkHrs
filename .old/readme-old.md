# Grind Time (Work Hours)

A simple, browser-based time tracking application that helps you log your work hours, calculate earnings, and export timesheets. Your data is automatically saved to the cloud.

## Features

- **Time Entry**: Log your work hours with start and end times.
- **Earnings Calculation**: Automatically calculates earnings based on your hourly rate.
- **Cloud Data Storage**: Your entries and settings are securely stored online using Firebase, associated with an anonymous user ID.
- **Filterable History**: Filter your time entries by date range.
- **Data Export**: Generate and download CSV data for easy export to spreadsheets.
- **Responsive Design**: Works on desktop and mobile devices.
- **Overnight Shift Support**: Properly handles shifts that span across midnight.

## Getting Started

Simply open the application in your web browser to start tracking your time! No complex setup is needed.

1.  **Set Your Hourly Rate**: Enter your hourly rate in the settings section and click "Save." This is saved to your anonymous cloud profile.
2.  **Log Time**: Fill in the date, start time, end time, and optional description, then click "Add Entry." Your entry is saved to the cloud.
3.  **View History**: All your entries appear in the table below, sorted by date (newest first).
4.  **Filter Entries**: Use the date filters to view entries within a specific time period.
5.  **Export Data**: Generate a CSV of your filtered entries.

## Data Privacy

All data is stored in Firebase Realtime Database under an anonymous user ID generated upon your first visit. This means your data is tied to your browser profile but not to any personal information unless you explicitly provide it elsewhere.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](license.md) file for details.

## Acknowledgments

- Built with vanilla JavaScript, HTML, and CSS.
- Utilizes Firebase for backend services (Authentication and Realtime Database).
- Inspired by the need for a simple, privacy-focused time tracking solution.
