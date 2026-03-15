# Introduction
This is a web-based application that supports a gym stadium manager to operate the gym’s activities. It can reduce paperwork and missed training classes by providing a clear schedule, and the manager can monitor how well the gym is operating from a dashboard.
The app is accessible at: https://mmpilates.lovable.app/

# Functionalities

## For Trainees:
- Create/Login: They can create by their email address or using the OAuth method, such as a Google Account.
- Book a training session: select an available slot and make a booking at the selected time.
- View all open bookings
- Cancel booking
- Update personal contact information
- Redeem a voucher to get extra credits
- Refer a friend via an invitation link to get credits award
- Change email securely
- Notification

## For Trainers:
- Create/Login: They can create an account like other trainees and ask the admin to set them as a trainer
- See the upcoming training session
- Book new sessions for trainees if they cannot book for themself.
- Check the finished training session

## For the administrator:
- Invite/create new users
- Manage trainees
- Assign the training package to a trainee, update the training credits
- Manage trainers
- Manage training packages
- Manage schedule, create training class
- Manage bookings
- Configure the price model for training times on a day
(peak time or off-peak time)
- Configure the cancellation policy: let the credit be refunded or not depend on the time the trainee cancels their bookings in advance
- Compensation: Calculate salary for trainer on each successful training session, can be a fixed amount or a percentage
- Create promotion/campaign: to give credits to trainees in many ways
- Configure email content to send out emails from the app, such as activation email, change password, promotion, and credits awarding.

## General functions:
- Change theme
- Change language
- Show/Hide main menu
- Logout

# Libraries
The app is using these main libraries or external APIs:
- Open authorization: Google account
- Supabase: store database and web-hooks, such as
- i18n to translate languages
- Use Vite to generate a frontend codebase
- Use React.js to build the app structure and components

# Please watch the file: "Functional highlight.pdf" for more screenshots
