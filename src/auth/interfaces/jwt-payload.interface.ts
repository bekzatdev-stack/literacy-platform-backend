export interface JwtPayload {
  sub: string;
  role: 'PARENT' | 'ADMIN';
  accountType: 'USER';
  tokenType: 'access' | 'refresh';
}
