# The Business of Happiness

## System reqs

- iOS/Android, React, Typescript, React Native, Expo 56.0.12, Supabase, NativeWind CSS, expo-notifications
- Supabase Auth with social SSO, user info is gathered from this

## App reqs

### Start Here

- Welcome page saying "Hello [Name], welcome to The Business of Happiness!"
- Announcements can be posted here on a per-course or app-wide basis
- "Hop back in" section with videos the user is in the middle of
- Settings card at the bottom, linking to a page with login/logout, a Privacy Policy, and Terms of Service

### Community

- Separated into communities for each course, whitelist clients into courses
  - The "Business of Happiness" community - broader community across all courses in which any user can post content (photo, text), and other users can respond to content with text. whitelisted into it automatically
- Notification when content is posted from Tarryn/admin
- Tagging other users
- Respond to topics w text or images
  - admins will be able to delete content, however this will not be implemented yet and will be pushed in the admin site which will be developed later
- Videos must be uploadable to the community board
- Should appear as topic w video or question, clickable to reveal response
- Users can click on other peoples names to direct message them, or click the dms icon in the top right corner to see all dms
- Reach Out Here button at the top of DMs always that sends a message to Tarryn (all the admins and Tarryn, though it appears only as Tarryn)
  - Upon this inbox recieving a message, send the message to <tarryn@drtarrynmaccarthy.com> and <hereforyou@drtarrynmaccarthy.com>
    - this is one way, and can be done via email or in the app, and the user will receive a notification when Tarryn/admin responds (which they will do via the app)
    - done with a supabase function that calls an email provider

### Course Access

- Courses are only accessible to whitelisted users, which can come from FunnelBreezy, webhook on purchase?
  - still deciding method to allow access to courses, purchaser can be mapped by email for now
    - fallback is a manual whitelist of emails, which can be done via the admin portal later and the supabase directly for now
  - all course content will be supplied through the supabase for now, admin portal to come at a later date
- Courses split into categories
  - Welcome section, posted immediately after purchase
  - Nervous System Regulation Vault, posted immediately after purchase
    - Series of clips and audios
    - Clips/audios can be favorited and put into "Resources"
  - Meditation and Visualization Vault, posted immediately after purchase
    - Series of clips and audios
    - Clips/audios can be favorited and put into "Resources"
  - Modules section, titled, scheduled out w go-live dates so that week 1 appears on day of event, week 2 appears 7 days after start of event, etc etc (done on a global basis, i.e for all users in the course)
    - Lessons: module subcategories
    - Each lesson is a video, must be titled and have the option to change speed
    - Each lesson has PDFs and audio recordings that go into "Resources" after the lesson is completed
      - lesson is completed when current video is played through or user plays the next video in the module for longer than 30 seconds
        - though, keep user progress on the older video, and keep user progress between app sessions
  - Live Session recordings, this is where weekly live meetings go after they are completed

### Resources

- Users can favorite clips, audios, PDFs, and lessons to save them into their personal "Resources" section
- Resources are default sorted by type (clips, audios, PDFs, lessons) and can be filtered by type
- Users can purchase meditations and nervous system regulation audios, which get added to Resources
  - Purchasing meditations and audios is a v2 feature

### Roles

- Admin
  - Courses and content can be added by admins via the webapp, which will be developed at a later date
  - admins will recieve and be able to respond to all the messages sent to Tarryn via the "Reach Out Here" button in the DMs
  - Admins can post content to the community board, and will be able to delete content in the future via the admin portal
- Tarryn
  - Tarryn is the primary admin, and can do everything an admin can do
  - Tarryn will receive and be able to respond to all the messages sent to Tarryn via the "Reach Out Here" button in the DMs
- User
  - Users can access courses they are whitelisted into, and can post content to the community board
  - Users can send messages to Tarryn via the "Reach Out Here" button in the DMs

### Additional Notes

- All colors in the app will be pulled from the Nativewind config, and will be consistent across the app
- All text will be pulled from a central text file, and will be consistent across the app
  - this will remain english only
- Offline access to course content is a v2 feature
- Privacy Policy and Terms of Service will be linked in the settings page, and will be hosted on a separate website, for now link to <https://thebizofhappiness.com/legal/#privacy>, <https://thebizofhappiness.com/legal/#terms>
