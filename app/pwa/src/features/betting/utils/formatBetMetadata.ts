export function formatTimestamp(timestamp: any): string {
    if (!timestamp) return 'N/A';

    let date: Date;

    if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
    } else if (typeof timestamp === 'object') {
        if (typeof timestamp.toDate === 'function') {
            date = timestamp.toDate();
        } else if ('seconds' in timestamp) {
            date = new Date(timestamp.seconds * 1000);
        } else if ('_seconds' in timestamp) {
            date = new Date(timestamp._seconds * 1000);
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

export function formatDate(dateInput: any): string {
    if (!dateInput) return 'N/A';

    let date: Date;

    if (dateInput instanceof Date) {
        date = dateInput;
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        date = new Date(dateInput);
    } else if (typeof dateInput === 'object') {
        if (typeof dateInput.toDate === 'function') {
            date = dateInput.toDate();
        } else if ('seconds' in dateInput) {
            date = new Date(dateInput.seconds * 1000);
        } else if ('_seconds' in dateInput) {
            date = new Date(dateInput._seconds * 1000);
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
