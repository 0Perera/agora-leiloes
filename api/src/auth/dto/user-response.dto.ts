import { Role } from '../../users/user.entity';

export class UserResponseDto {
  id!: number;
  name!: string;
  email!: string;
  role!: Role;
}
