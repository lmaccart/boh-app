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

export type AppText = typeof text;
