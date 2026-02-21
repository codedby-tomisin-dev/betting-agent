type FirestoreTimestamp = { toDate?: () => Date; seconds?: number; _seconds?: number };
type DateInput = Date | string | number | FirestoreTimestamp | null | undefined;

export function formatTimestamp(timestamp: DateInput): string {
    if (!timestamp) return 'N/A';

    let date: Date;

    if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
    } else if (typeof timestamp === 'object') {
        const tsObj = timestamp as FirestoreTimestamp;
        if (typeof tsObj.toDate === 'function') {
            date = tsObj.toDate();
        } else if ('seconds' in tsObj && typeof tsObj.seconds === 'number') {
            date = new Date(tsObj.seconds * 1000);
        } else if ('_seconds' in tsObj && typeof tsObj._seconds === 'number') {
            date = new Date(tsObj._seconds * 1000);
        } else {
            return 'N/A';
        }
    } else {
        return 'N/A';
    }

    if (isNaN(date.getTime())) {
        return 'N/A';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatDate(dateInput: DateInput): string {
    if (!dateInput) return 'N/A';

    let date: Date;

    if (dateInput instanceof Date) {
        date = dateInput;
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        date = new Date(dateInput);
    } else if (typeof dateInput === 'object') {
        const tsObj = dateInput as FirestoreTimestamp;
        if (typeof tsObj.toDate === 'function') {
            date = tsObj.toDate();
        } else if ('seconds' in tsObj && typeof tsObj.seconds === 'number') {
            date = new Date(tsObj.seconds * 1000);
        } else if ('_seconds' in tsObj && typeof tsObj._seconds === 'number') {
            date = new Date(tsObj._seconds * 1000);
        } else {
            return 'N/A';
        }
    } else {
        return 'N/A';
    }

    if (isNaN(date.getTime())) {
        return 'N/A';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}
