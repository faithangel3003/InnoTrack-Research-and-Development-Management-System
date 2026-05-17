export const securityQuestions = [
  'What was the name of your first pet?',
  'What city were you born in?',
  'What was the name of your elementary school?',
  "What is your mother's maiden name?",
  'What was the make of your first car?',
] as const

export type SecurityQuestionOption = typeof securityQuestions[number]