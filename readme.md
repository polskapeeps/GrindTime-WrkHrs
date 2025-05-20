# Grind Time (Work Hours)

Grind Time is a straightforward web app to help you easily track your work hours, see your earnings, and export your data. Everything you log is saved securely to your personal cloud account, so you can access it wherever you are.

## Features

- **Time Entry**: Quickly log your work sessions with date, start, and end times.
- **Earnings Calculation**: Automatically calculates your pay based on your set hourly rate.
- **Secure Cloud Sync**: Your entries and settings are saved to your personal Firebase account, accessible only by you after logging in.
- **Filterable History**: View and filter your time entries by date range to find what you need.
- **Data Export**: Generate and download your work logs as a CSV file.
- **Responsive Design**: Works well on both desktop and mobile browsers.
- **Overnight Shift Support**: Correctly handles work shifts that span past midnight.

## How to Use (for the Deployed App)

1.  **Sign Up / Sign In**: First, create an account using your email and password, or sign in if you already have one. This keeps your data private and secure.
2.  **Set Your Hourly Rate**: Once logged in, head to the settings area to enter your hourly rate and click "Save." This rate is stored with your account and used for pay calculations.
3.  **Log Your Hours**: Use the main form to add new time entries. You'll need the date, start time, end time, and you can add an optional description for the task.
4.  **Review & Filter**: Your past entries are displayed in a table, sorted by date. You can use the filter controls to narrow down entries to a specific period.
5.  **Export Data**: Need your records? You can export the filtered list of your work hours to a CSV file.

## Running Locally (for Developers)

If you want to run the app locally or contribute:

1.  **Clone the Repository**:
    ```bash
    git clone [https://github.com/polskapeeps/Hours-Tracker.git](https://github.com/polskapeeps/Hours-Tracker.git)
    cd Hours-Tracker
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Run the Development Server**:

    ```bash
    npm run dev
    ```

    This will start the Vite development server, and the app will typically be available at `http://localhost:5173` in your browser. The page will automatically reload if you make changes to the code.

4.  **Build for Production**:
    To create an optimized static build (e.g., for deploying to a web host):
    ```bash
    npm run build
    ```
    The output files will be in the `dist` directory.

## Data Storage & Privacy

Your work hour entries and hourly rate are securely stored online using Firebase Realtime Database. This data is linked directly to the email and password you use to sign in, ensuring that only you can access your information after authenticating.

## Contributing

Contributions are welcome! If you have ideas for improvements or find any bugs, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](license.md) file for details.

## Technology

- Vanilla JavaScript, HTML, and CSS for the core application.
- Firebase (Authentication and Realtime Database) for user accounts and data storage.
- Vite for the development environment and build process.
