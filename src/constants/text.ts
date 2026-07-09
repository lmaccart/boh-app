// Central source of all user-facing copy (English only).
// Every screen and component must pull strings from here — no inline literals.
export const text = {
  app: {
    name: "The Business of Happiness",
  },
  common: {
    loading: "Loading",
    retry: "Try again",
    somethingWentWrong: "Something went wrong.",
    cancel: "Cancel",
    send: "Send",
    post: "Post",
    reply: "Reply",
    save: "Save",
    seeAll: "See all",
  },
  auth: {
    signInTitle: "Welcome back",
    signInSubtitle: "Sign in to continue.",
    signUpTitle: "Create your account",
    signUpSubtitle: "Join The Business of Happiness.",
    nameLabel: "Name",
    namePlaceholder: "Your name",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Your password",
    signInButton: "Sign in",
    signUpButton: "Create account",
    toggleToSignUp: "New here? Create an account",
    toggleToSignIn: "Already have an account? Sign in",
    signOut: "Sign out",
    errors: {
      missingFields: "Please fill in all fields.",
      generic: "We could not complete that. Check your details and try again.",
    },
  },
  account: {
    signedInAs: "Signed in as",
  },
  tabs: {
    startHere: "Start Here",
    community: "Community",
    courses: "Courses",
    resources: "Resources",
  },
  startHere: {
    // {name} is replaced at render time via format().
    greeting: "Hello {name}, welcome to The Business of Happiness!",
    greetingFallbackName: "there",
    announcementsTitle: "Announcements",
    announcementsEmpty: "No announcements yet.",
    appWide: "App-wide",
    hopBackInTitle: "Hop back in",
    hopBackInEmpty: "Lessons you start will show up here so you can pick up where you left off.",
    secondsWatched: "{seconds}s watched",
    settingsCard: "Settings",
    settingsCardBody: "Account, privacy policy, and terms of service.",
  },
  settings: {
    title: "Settings",
    accountSection: "Account",
    legalSection: "Legal",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    signOut: "Sign out",
  },
  courses: {
    title: "Courses",
    empty: "You are not enrolled in any courses yet.",
    sections: {
      welcome: "Welcome",
      nsr: "Nervous System Regulation Vault",
      meditation: "Meditation and Visualization Vault",
      module: "Modules",
      live: "Live Session Recordings",
    },
    lessonsEmpty: "No lessons in this section yet.",
    resourcesTitle: "Resources",
    resourcesLocked: "Complete this lesson to unlock its resources.",
    playbackSpeed: "Speed",
    markComplete: "Mark complete",
    completed: "Completed",
  },
  community: {
    title: "Community",
    globalFeed: "Business of Happiness",
    newPost: "New post",
    newPostBody: "Share a photo, video, or question with the community.",
    postPlaceholder: "What would you like to share?",
    addMedia: "Add photo or video",
    repliesTitle: "Replies",
    repliesEmpty: "No replies yet. Be the first to respond.",
    replyPlaceholder: "Write a reply",
    feedEmpty: "No posts yet.",
    tapToExpand: "Tap to view replies",
  },
  dms: {
    title: "Messages",
    empty: "No conversations yet.",
    reachOut: "Reach Out Here",
    reachOutSubtitle: "Send a private message to Tarryn.",
    messagePlaceholder: "Write a message",
    unavailable: "Messaging is not available right now.",
  },
  resources: {
    title: "Resources",
    empty: "Favorite clips, audios, PDFs, and lessons to save them here.",
    filterAll: "All",
    types: {
      clip: "Clips",
      audio: "Audios",
      pdf: "PDFs",
      lesson: "Lessons",
    },
  },
  notifications: {
    permissionDenied: "Enable notifications to hear from Tarryn and your community.",
  },
  placeholders: {
    startHere: {
      title: "Start Here",
      body: "Your welcome hub, announcements, and in-progress lessons will appear here.",
    },
    community: {
      title: "Community",
      body: "Course and community feeds will appear here.",
    },
    courses: {
      title: "Courses",
      body: "Courses you are enrolled in will appear here.",
    },
    resources: {
      title: "Resources",
      body: "Your saved clips, audios, PDFs, and lessons will appear here.",
    },
  },
} as const;

// Lightweight {placeholder} interpolation so copy stays centralized while still
// supporting dynamic values (e.g. the personalized welcome greeting).
export function format(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}
