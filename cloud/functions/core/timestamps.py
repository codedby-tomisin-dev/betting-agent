"""
Timestamp utilities that decouple core logic from Firebase sentinels.

In production the repositories receive SERVER_TIMESTAMP so Firestore sets the
server-side time.  In tests, callers can monkey-patch `server_timestamp` to
return a plain datetime instead.
"""
from __future__ import annotations


def server_timestamp():
    """Return the Firestore SERVER_TIMESTAMP sentinel.

    Importing firebase_admin is deferred so this module can be imported in
    test environments without a live Firebase connection.
    """
    from firebase_admin import firestore as admin_firestore
    return admin_firestore.SERVER_TIMESTAMP
