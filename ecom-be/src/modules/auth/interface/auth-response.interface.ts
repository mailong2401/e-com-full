import { User } from 'src/modules/user/user.entity';

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
}
