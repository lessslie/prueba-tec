export interface MeliItem {
  id: string;
  title: string;
  price: number;
  status: string;
  available_quantity: number;
  sold_quantity: number;
  category_id: string;
}

export interface MeliItemDescription {
  plain_text?: string;
  text?: string;
}


