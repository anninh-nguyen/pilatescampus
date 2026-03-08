

## Pilates Campus Management System

### Authentication
- Login/signup via email and Google OAuth
- Three roles: **Admin**, **Trainer**, **Trainee** (stored in a separate `user_roles` table)
- Role-based routing: each role sees their own dashboard after login

### Admin Features
1. **Dashboard** — overview stats: active trainees, upcoming sessions, package usage, revenue summary
2. **Trainer Management** — add/edit/remove trainers, view their schedules
3. **Trainee Management** — add/edit/remove trainees, view their packages and booking history
4. **Training Packages** — create packages with a name, description, credit count, price, and expiry period; assign packages to trainees
5. **Class Schedule Management** — create class slots (date, time, trainer, class type, capacity); manage recurring weekly schedules
6. **Reports** — attendance stats, package utilization, revenue reports with charts

### Trainer Features
1. **My Schedule** — calendar view of upcoming assigned sessions with trainee details
2. **Session History** — past sessions log
3. **Notifications** — list of upcoming session reminders

### Trainee Features
1. **My Package** — view active package, remaining credits, expiry date
2. **Book Sessions** — calendar view to browse available classes; book individual sessions or set up recurring weekly bookings (auto-books same slot each week until credits run out)
3. **My Bookings** — list of upcoming and past bookings; cancel with credit refund if within cancellation window
4. **Notifications** — reminders for upcoming sessions

### Database (Supabase)
- `profiles` — user profile data
- `user_roles` — role assignments (admin/trainer/trainee)
- `trainers` — trainer-specific info
- `packages` — training package definitions
- `trainee_packages` — assigned packages with remaining credits and expiry
- `class_slots` — scheduled classes (time, trainer, capacity)
- `bookings` — individual session bookings linking trainees to class slots
- `notifications` — session reminders
- RLS policies on all tables with security-definer role-check function

### Key UX Details
- **Cancellation policy**: trainees can cancel and get credit back if done 24+ hours before the session
- **Capacity limits**: bookings blocked when a class slot is full
- **Recurring booking**: when a trainee selects "recurring," the system auto-creates bookings for the same weekday/time for subsequent weeks until credits are exhausted
- **Email notifications**: edge function sends reminders 24 hours before sessions
- Clean, modern UI with sidebar navigation per role

