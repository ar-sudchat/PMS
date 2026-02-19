export interface Customer {
    id: string;
    code: string;
    name: string;
    short_name?: string;
    is_customer: boolean;
    is_prime: boolean;
    is_partner: boolean;
    is_vendor: boolean;
    address?: string;
    tax_id?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CustomerFormData {
    id?: string;
    code: string;
    name: string;
    short_name: string;
    is_customer: boolean;
    is_prime: boolean;
    is_partner: boolean;
    is_vendor: boolean;
    address: string;
    tax_id: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    is_active: boolean;
}
