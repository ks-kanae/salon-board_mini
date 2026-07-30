import { useRef } from "react";
import { StaffReservation, ScheduleBlock } from "@/types/reservation";
import { toJst } from "@/lib/date";

const CELL_WIDTH = 80;
const ROW_HEIGHT = 80;
const TIME_LABEL_WIDTH = 150;

const toJstStr = (d: Date): string => {
    const jst = toJst(d.toISOString());
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth()+1)}-${pad(jst.getUTCDate())}T${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:00`;
};

type Staff = { id: number; name: string };

type DragState = {
    type: 'move' | 'resize';
    reservationId: number | null;
    blockId: number | null;
    startX: number;
    startY: number;
    originalStart: string;
    originalEnd: string;
    currentStart: string;
    currentEnd: string;
    originalStaffId: number | null;
    currentStaffId: number | null;
};

type Props = {
    openHour: number;
    closeHour: number;
    staffList: Staff[];
    tableRef: React.RefObject<HTMLDivElement>;
    setReservations: React.Dispatch<React.SetStateAction<StaffReservation[]>>;
    setScheduleBlocks: React.Dispatch<React.SetStateAction<ScheduleBlock[]>>;
    setPendingChange: (v: {
        reservationId: number;
        newStart: string;
        newEnd: string;
        newStaffId: number | null;
        originalStart: string;
        originalEnd: string;
        originalStaffId: number | null;
    } | null) => void;
    setBlockSuccessMessage: (v: string) => void;
    setShowBlockMoveSuccess: (v: boolean) => void;
    setBlockError: (v: string | null) => void;
};

export function useReservationDrag({
    openHour, closeHour, staffList, tableRef,
    setReservations, setScheduleBlocks,
    setPendingChange, setBlockSuccessMessage,
    setShowBlockMoveSuccess, setBlockError,
}: Props) {
    const didDrag = useRef(false);
    const dragStartX = useRef(0);
    const dragState = useRef<DragState | null>(null);

    // Y座標からスタッフを特定
    const getStaffFromY = (clientY: number): number | null => {
        if (!tableRef.current) return null;
        const tableRect = tableRef.current.getBoundingClientRect();
        // ヘッダー行(40px)を除いた相対Y座標
        const relY = clientY - tableRect.top - 40;
        if (relY < 0) return null;

        let accumulatedHeight = 0;
        for (const staff of staffList) {
            const rowHeight = ROW_HEIGHT; // 簡易版：レーン数を考慮しない
            if (relY < accumulatedHeight + rowHeight) {
                return staff.id;
            }
            accumulatedHeight += rowHeight;
        }
        return null;
    };

    // 予約のドラッグ開始
    const onReservationDragStart = (
        e: React.MouseEvent,
        r: StaffReservation,
        type: 'move' | 'resize'
    ) => {
        e.preventDefault();
        e.stopPropagation();

        // 前のドラッグが残っていたらリセット
        if (dragState.current) {
            dragState.current = null;
        }

        didDrag.current = false;
        dragStartX.current = e.clientX;

        dragState.current = {
            type,
            reservationId: r.id,
            blockId: null,
            startX: e.clientX,
            startY: e.clientY,
            originalStart: r.start_at,
            originalEnd: r.end_at,
            currentStart: r.start_at,
            currentEnd: r.end_at,
            originalStaffId: r.staff_id,
            currentStaffId: r.staff_id,
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!dragState.current) return;
            if (Math.abs(e.clientX - dragStartX.current) > 5) didDrag.current = true;

            const dx = e.clientX - dragState.current.startX;
            const minDiff = Math.round(dx / CELL_WIDTH) * 30;

            if (dragState.current.type === 'move') {
                const newStart = new Date(new Date(dragState.current.originalStart).getTime() + minDiff * 60000);
                const newEnd   = new Date(new Date(dragState.current.originalEnd).getTime() + minDiff * 60000);
                const startHour = newStart.getUTCHours() + 9 + newStart.getUTCMinutes() / 60;
                const endHour   = newEnd.getUTCHours() + 9 + newEnd.getUTCMinutes() / 60;
                if (startHour < openHour || endHour > closeHour) return;

                // Y座標からスタッフを特定
                const hoveredStaffId = getStaffFromY(e.clientY);

                dragState.current.currentStart = toJstStr(newStart);
                dragState.current.currentEnd   = toJstStr(newEnd);
                if (hoveredStaffId !== null) {
                    dragState.current.currentStaffId = hoveredStaffId;
                }

                setReservations(prev => prev.map(res => {
                    if (res.id !== dragState.current!.reservationId) return res;
                    return {
                        ...res,
                        start_at: toJstStr(newStart),
                        end_at: toJstStr(newEnd),
                        staff_id: dragState.current!.currentStaffId,
                    };
                }));
            } else {
                // リサイズ
                const newEnd  = new Date(new Date(dragState.current.originalEnd).getTime() + minDiff * 60000);
                const endHour = newEnd.getUTCHours() + 9 + newEnd.getUTCMinutes() / 60;
                if (endHour > closeHour) return;
                if (newEnd.getTime() - new Date(dragState.current.originalStart).getTime() < 30 * 60000) return;
                dragState.current.currentEnd = toJstStr(newEnd);
                setReservations(prev => prev.map(res =>
                    res.id !== dragState.current!.reservationId ? res : { ...res, end_at: toJstStr(newEnd) }
                ));
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (!dragState.current) return;
            const orig = dragState.current;
            dragState.current = null;
            if (!didDrag.current) return;

            const timeUnchanged =
                new Date(orig.originalStart).getTime() === new Date(orig.currentStart).getTime() &&
                new Date(orig.originalEnd).getTime() === new Date(orig.currentEnd).getTime();
            const staffUnchanged = orig.originalStaffId === orig.currentStaffId;
            if (timeUnchanged && staffUnchanged) return;

            setPendingChange({
                reservationId: orig.reservationId!,
                newStart: orig.currentStart.includes('Z') ? toJstStr(new Date(orig.currentStart)) : orig.currentStart,
                newEnd:   orig.currentEnd.includes('Z') ? toJstStr(new Date(orig.currentEnd)) : orig.currentEnd,
                newStaffId: orig.currentStaffId,
                originalStart: orig.originalStart,
                originalEnd:   orig.originalEnd,
                originalStaffId: orig.originalStaffId,
            });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // ブロックのドラッグ開始（移動）
    const onBlockMoveDragStart = (
        e: React.MouseEvent,
        b: ScheduleBlock,
        api: any,
    ) => {
        e.preventDefault();
        e.stopPropagation();

        // 前のドラッグが残っていたらリセット
        if (dragState.current) {
            dragState.current = null;
        }

        didDrag.current = false;
        dragStartX.current = e.clientX;

        dragState.current = {
            type: 'move',
            reservationId: null,
            blockId: b.id,
            startX: e.clientX,
            startY: e.clientY,
            originalStart: toJstStr(new Date(b.start_at)),
            originalEnd: toJstStr(new Date(b.end_at)),
            currentStart: toJstStr(new Date(b.start_at)),
            currentEnd: toJstStr(new Date(b.end_at)),
            originalStaffId: b.staff_id,
            currentStaffId: b.staff_id,
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!dragState.current) return;
            if (Math.abs(e.clientX - dragStartX.current) > 5) didDrag.current = true;
            const dx = e.clientX - dragState.current.startX;
            const minDiff = Math.round(dx / CELL_WIDTH) * 30;
            const newStart = new Date(new Date(dragState.current.originalStart).getTime() + minDiff * 60000);
            const newEnd   = new Date(new Date(dragState.current.originalEnd).getTime() + minDiff * 60000);
            const startHour = newStart.getUTCHours() + 9 + newStart.getUTCMinutes() / 60;
            const endHour   = newEnd.getUTCHours() + 9 + newEnd.getUTCMinutes() / 60;
            if (startHour < openHour || endHour > closeHour) return;

            // Y座標からスタッフを特定して追加
            const hoveredStaffId = getStaffFromY(e.clientY);

            dragState.current.currentStart = toJstStr(newStart);
            dragState.current.currentEnd   = toJstStr(newEnd);
            if (hoveredStaffId !== null) {
                dragState.current.currentStaffId = hoveredStaffId;
            }

            setScheduleBlocks(prev => prev.map(sb =>
                sb.id === b.id ? {
                    ...sb,
                    start_at: toJstStr(newStart),
                    end_at: toJstStr(newEnd),
                    staff_id: dragState.current!.currentStaffId ?? sb.staff_id,
                } : sb
            ));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (!dragState.current || !didDrag.current) { dragState.current = null; return; }
            const orig = dragState.current;
            dragState.current = null;
            api.patch(`/api/staff/schedule-blocks/${b.id}`, {
                start_at: orig.currentStart,
                end_at: orig.currentEnd,
                staff_id: orig.currentStaffId, // スタッフIDも送信
            })
                .then(() => { setBlockSuccessMessage('予定を変更しました'); setShowBlockMoveSuccess(true); setTimeout(() => setShowBlockMoveSuccess(false), 1000); })
                .catch((err: any) => {
                    setScheduleBlocks(prev => prev.map(sb => sb.id === b.id ? { ...sb, start_at: orig.originalStart, end_at: orig.originalEnd, staff_id: orig.originalStaffId } : sb));
                    setBlockError(err.response?.data?.message || 'この時間帯には予約または予定が入っています。');
                });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // ブロックのリサイズ
    const onBlockResizeDragStart = (
        e: React.MouseEvent,
        b: ScheduleBlock,
        api: any,
    ) => {
        e.preventDefault();
        e.stopPropagation();

        // 前のドラッグが残っていたらリセット
        if (dragState.current) {
            dragState.current = null;
        }

        didDrag.current = false;
        dragStartX.current = e.clientX;

        dragState.current = {
            type: 'resize',
            reservationId: null,
            blockId: b.id,
            startX: e.clientX,
            startY: e.clientY,
            originalStart: toJstStr(new Date(b.start_at)),
            originalEnd: toJstStr(new Date(b.end_at)),
            currentStart: toJstStr(new Date(b.start_at)),
            currentEnd: toJstStr(new Date(b.end_at)),
            originalStaffId: b.staff_id,
            currentStaffId: b.staff_id,
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!dragState.current) return;
            if (Math.abs(e.clientX - dragStartX.current) > 5) didDrag.current = true;
            const minDiff = Math.round((e.clientX - dragState.current.startX) / CELL_WIDTH) * 30;
            const newEnd = new Date(new Date(dragState.current.originalEnd).getTime() + minDiff * 60000);
            const endHour = newEnd.getUTCHours() + 9 + newEnd.getUTCMinutes() / 60;
            if (endHour > closeHour) return;
            if (newEnd.getTime() - new Date(dragState.current.originalStart).getTime() < 30 * 60000) return;
            dragState.current.currentEnd = toJstStr(newEnd);
            setScheduleBlocks(prev => prev.map(sb =>
                sb.id === b.id ? { ...sb, end_at: toJstStr(newEnd) } : sb
            ));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (!dragState.current || !didDrag.current) { dragState.current = null; return; }
            const orig = dragState.current;
            dragState.current = null;
            api.patch(`/api/staff/schedule-blocks/${b.id}`, { start_at: orig.currentStart, end_at: orig.currentEnd })
                .then(() => { setBlockSuccessMessage('予定を変更しました'); setShowBlockMoveSuccess(true); setTimeout(() => setShowBlockMoveSuccess(false), 1000); })
                .catch((err: any) => {
                    setScheduleBlocks(prev => prev.map(sb => sb.id === b.id ? { ...sb, start_at: orig.originalStart, end_at: orig.originalEnd } : sb));
                    setBlockError(err.response?.data?.message || 'この時間帯には予約または予定が入っています。');
                });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return {
        didDrag,
        onReservationDragStart,
        onBlockMoveDragStart,
        onBlockResizeDragStart,
    };
}
