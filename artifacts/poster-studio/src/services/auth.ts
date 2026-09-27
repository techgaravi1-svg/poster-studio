export type DemoUser = { name: string; email: string };
export const authService = {
  async login(_email: string, _password: string) { throw new Error('Demo account access is local-only. Connect an auth provider to enable login.'); },
  async register(_name: string, _email: string, _password: string) { throw new Error('Demo account access is local-only. Connect an auth provider to enable registration.'); },
  async forgotPassword(_email: string) { return 'Password reset requires a connected auth service.'; },
};