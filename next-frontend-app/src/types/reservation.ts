export type Payment = {
    id: number;
    amount: number;
    discount: number;
    method: 'cash' | 'credit' | 'cashless' | null;
    is_draft: boolean;
    paid_at: string | null;
    sales_date: string | null;
    daily_closing_id: number | null;
};

export type Reservation = {
    id: number;
    start_at: string;
    end_at: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    type: 'online' | 'manual' | 'next';
    notes: string | null;
    user: { id: number; name: string; phone: string | null };
    menus: { id: number; name: string; pivot: { price_at_booking: number } }[];
    payment: Payment | null;
};

export type DashboardData = {
    date: string;
    is_closed: boolean;
    closing: {
        id: number;
        total_sales: number;
        total_count: number;
        memo: string | null;
        closed_by: { name: string };
        closed_at: string;
    } | null;
    prev_closing: {
        id: number;
        closed_at: string;
        date: string;
    } | null;
    today_reservations: Reservation[];
    carry_over_reservations: Reservation[];
    after_closing_reservations: Reservation[];
    unpaid_reservations: Reservation[];
    total_sales: number;
    total_count: number;
    breakdown: {
        cash: number;
        credit: number;
        cashless: number;
    };
};

export type SalesSummary = {
    total_sales: number;
    total_count: number;
    breakdown: {
        cash: number;
        credit: number;
        cashless: number;
    };
};

// 予約管理ページ用のReservation型（ダッシュボード用とは別）
export type StaffReservation = {
    id: number;
    start_at: string;
    end_at: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    type: 'online' | 'manual' | 'next';
    notes: string | null;
    staff_id: number | null;
    is_nominated: boolean | number;
    user: { id: number; name: string; phone: string | null };
    menus: { id: number; name: string; pivot: { price_at_booking: number } }[];
    payment: { id: number; is_draft: boolean } | null;
};

export type ScheduleBlock = {
    id: number;
    staff_id: number | null
    title: string;
    start_at: string;
    end_at: string;
    staff: { id: number; name: string } | null;
};
