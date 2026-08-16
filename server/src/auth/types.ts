export type AuthenticatedUser = {
  id: string;
  email: string;
  createdAt: Date;
};

export type AuthContext = {
  userId: string;
  user: AuthenticatedUser;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
