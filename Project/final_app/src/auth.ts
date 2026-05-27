export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const USERS_KEY = 'spreadsheet_users';
const SESSION_KEY = 'spreadsheet_session';

interface Session {
  userId: string;
  token: string;
  expiresAt: number;
}

const generateToken = (): string => {
  return btoa(Date.now().toString() + Math.random().toString());
};

const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  if (stored) return JSON.parse(stored);
  return [];
};

const saveUsers = (users: User[]): void => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const mockAuth = {
  login: async (email: string, password: string): Promise<void> => {
    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (!user) throw new Error('User not found');
    if (password.length < 8) throw new Error('Invalid password');
    const session: Session = {
      userId: user.id,
      token: generateToken(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem('current_user', JSON.stringify(user));
  },
  
  register: async (name: string, email: string, password: string, confirmPassword: string): Promise<void> => {
    if (!name) throw new Error('Name is required');
    if (!email || !email.includes('@')) throw new Error('Invalid email');
    if (password.length < 8) throw new Error('Password must be at least 8 characters');
    if (password !== confirmPassword) throw new Error('Passwords do not match');
    
    const users = getUsers();
    if (users.find(u => u.email === email)) throw new Error('User already exists');
    
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveUsers(users);
    
    const session: Session = {
      userId: newUser.id,
      token: generateToken(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem('current_user', JSON.stringify(newUser));
  },
  
  logout: (): void => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('current_user');
  },
  
  getUser: (): User | null => {
    const stored = localStorage.getItem('current_user');
    if (!stored) return null;
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    const sessionData: Session = JSON.parse(session);
    if (sessionData.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('current_user');
      return null;
    }
    return JSON.parse(stored);
  },
  
  isAuthenticated: (): boolean => {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return false;
    const sessionData: Session = JSON.parse(session);
    if (sessionData.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('current_user');
      return false;
    }
    return true;
  },
};