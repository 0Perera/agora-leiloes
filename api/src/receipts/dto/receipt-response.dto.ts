export class ReceiptResponseDto {
  lotId!: number;
  number!: number;
  title!: string;
  artist!: string;
  amount!: number;
  alias!: string;
  settledAt!: Date;
  finalHash!: string;
  valid!: boolean;
}
