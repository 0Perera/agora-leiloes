import { UserResponseDto } from './user-response.dto';

export class AuthResponseDto {
  token!: string;
  user!: UserResponseDto;
}
