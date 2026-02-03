import { Timestamp } from 'firebase/firestore';

export function formatTimestamp(timestamp: Timestamp | Date | undefined): string {
    if (!timestamp) return 'N/A';

    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}
