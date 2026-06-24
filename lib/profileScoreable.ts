export function isProfileScoreable(_profile: unknown, hasQuizScore: boolean, connectedScored: boolean): boolean {
  return hasQuizScore || connectedScored;
}
