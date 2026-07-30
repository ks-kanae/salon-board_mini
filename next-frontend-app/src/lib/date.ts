export const getJstDateString = () => {
    const now = new Date();

    const jst = new Date(
        now.getTime() + 9 * 60 * 60 * 1000
    );

    return jst.toISOString().split("T")[0];
};

export const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString(
        "ja-JP",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Tokyo",
        }
    );
};

export const toJstDateStr = (iso: string) => {
    return new Date(iso).toLocaleDateString(
        "en-CA",
        {
            timeZone: "Asia/Tokyo",
        }
    );
};

export const toJst = (iso: string): Date => {
    return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
};
