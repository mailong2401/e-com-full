import { UserRole } from 'src/common/enums/user-role.enum';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}
