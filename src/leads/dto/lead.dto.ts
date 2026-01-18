export class LeadDto {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  cell: string;
  picture_large: string;
  summary?: string;
  next_action?: string;
  created_at: Date;
  updated_at: Date;
}
