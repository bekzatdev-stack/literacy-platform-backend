export interface AuthUser {
  sub: string;
  role: 'PARENT' | 'ADMIN';
  accountType: 'USER';
  tokenType: 'access';
}
