
import sqlite3
from pathlib import Path
from datetime import datetime


DB_PATH = Path(__file__).resolve().parents[2] / "cloudops.db"


def get_connection():
    """Create a database connection."""

    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database():
    """Create tables and safely migrate existing databases."""

    with get_connection() as conn:

        conn.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                resource TEXT NOT NULL,
                usage_percent REAL NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                recommendation TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Open',
                acknowledged_at TEXT,
                resolved_at TEXT
            )
        """)

        existing_columns = {
            row["name"]
            for row in conn.execute(
                "PRAGMA table_info(incidents)"
            ).fetchall()
        }

        migrations = {
            "status": "ALTER TABLE incidents ADD COLUMN status TEXT NOT NULL DEFAULT 'Open'",
            "acknowledged_at": "ALTER TABLE incidents ADD COLUMN acknowledged_at TEXT",
            "resolved_at": "ALTER TABLE incidents ADD COLUMN resolved_at TEXT",
        }

        for column, statement in migrations.items():
            if column not in existing_columns:
                conn.execute(statement)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                incident_id INTEGER,
                resource TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                severity TEXT NOT NULL,
                created_at TEXT NOT NULL,
                is_read INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (incident_id) REFERENCES incidents(id)
            )
        """)

        conn.commit()


def create_notification(
    incident_id,
    resource,
    title,
    message,
    severity,
):
    """Save a new notification."""

    with get_connection() as conn:
        cursor = conn.execute("""
            INSERT INTO notifications (
                incident_id,
                resource,
                title,
                message,
                severity,
                created_at,
                is_read
            )
            VALUES (?, ?, ?, ?, ?, ?, 0)
        """, (
            incident_id,
            resource,
            title,
            message,
            severity,
            datetime.now().isoformat(),
        ))

        conn.commit()
        return cursor.lastrowid


def get_notifications(limit=50):
    """Return recent notifications and unread count."""

    with get_connection() as conn:

        rows = conn.execute("""
            SELECT *
            FROM notifications
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()

        unread_count = conn.execute("""
            SELECT COUNT(*)
            FROM notifications
            WHERE is_read = 0
        """).fetchone()[0]

        return {
            "total_notifications": len(rows),
            "unread_count": unread_count,
            "notifications": [dict(row) for row in rows],
        }


def mark_notification_as_read(notification_id):
    """Mark one notification as read."""

    with get_connection() as conn:
        cursor = conn.execute("""
            UPDATE notifications
            SET is_read = 1
            WHERE id = ?
        """, (notification_id,))

        conn.commit()
        return cursor.rowcount == 1


def mark_all_notifications_as_read():
    """Mark all notifications as read."""

    with get_connection() as conn:
        cursor = conn.execute("""
            UPDATE notifications
            SET is_read = 1
            WHERE is_read = 0
        """)

        conn.commit()
        return cursor.rowcount


def save_incidents(incidents):
    """Save incidents and create notifications for new incidents
    or severity escalations.
    """

    timestamp = datetime.now().isoformat()

    with get_connection() as conn:

        for incident in incidents:

            resource = incident["resource"]
            severity = incident["severity"]

            existing = conn.execute("""
                SELECT id, severity
                FROM incidents
                WHERE resource = ?
                AND status IN ('Open', 'Acknowledged')
                ORDER BY id DESC
                LIMIT 1
            """, (resource,)).fetchone()

            if existing:

                incident_id = existing["id"]
                previous_severity = existing["severity"]

                conn.execute("""
                    UPDATE incidents
                    SET timestamp = ?,
                        usage_percent = ?,
                        severity = ?,
                        message = ?,
                        recommendation = ?
                    WHERE id = ?
                """, (
                    timestamp,
                    incident["usage_percent"],
                    severity,
                    incident["message"],
                    incident["recommendation"],
                    incident_id,
                ))

                if (
                    previous_severity.lower() != "critical"
                    and severity.lower() == "critical"
                ):
                    conn.execute("""
                        INSERT INTO notifications (
                            incident_id,
                            resource,
                            title,
                            message,
                            severity,
                            created_at,
                            is_read
                        )
                        VALUES (?, ?, ?, ?, ?, ?, 0)
                    """, (
                        incident_id,
                        resource,
                        f"{resource} incident escalated",
                        incident["message"],
                        severity,
                        timestamp,
                    ))

            else:

                cursor = conn.execute("""
                    INSERT INTO incidents (
                        timestamp,
                        resource,
                        usage_percent,
                        severity,
                        message,
                        recommendation,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, 'Open')
                """, (
                    timestamp,
                    resource,
                    incident["usage_percent"],
                    severity,
                    incident["message"],
                    incident["recommendation"],
                ))

                incident_id = cursor.lastrowid

                conn.execute("""
                    INSERT INTO notifications (
                        incident_id,
                        resource,
                        title,
                        message,
                        severity,
                        created_at,
                        is_read
                    )
                    VALUES (?, ?, ?, ?, ?, ?, 0)
                """, (
                    incident_id,
                    resource,
                    f"New {severity} {resource} incident",
                    incident["message"],
                    severity,
                    timestamp,
                ))

        conn.commit()


def get_incident_history(limit=50):
    """Retrieve recent incident history."""

    with get_connection() as conn:
        rows = conn.execute("""
            SELECT *
            FROM incidents
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()

        return [dict(row) for row in rows]


def get_incident_by_id(incident_id):
    """Retrieve one incident."""

    with get_connection() as conn:
        row = conn.execute("""
            SELECT *
            FROM incidents
            WHERE id = ?
        """, (incident_id,)).fetchone()

        return dict(row) if row else None


def update_incident_status(incident_id, status):
    """Update incident status and lifecycle timestamps."""

    allowed_statuses = {
        "Open",
        "Acknowledged",
        "Resolved",
    }

    if status not in allowed_statuses:
        raise ValueError("Invalid incident status.")

    timestamp = datetime.now().isoformat()

    with get_connection() as conn:

        existing = conn.execute("""
            SELECT id, acknowledged_at, resolved_at
            FROM incidents
            WHERE id = ?
        """, (incident_id,)).fetchone()

        if existing is None:
            return False

        acknowledged_at = existing["acknowledged_at"]
        resolved_at = existing["resolved_at"]

        if status == "Open":
            acknowledged_at = None
            resolved_at = None

        elif status == "Acknowledged":
            acknowledged_at = timestamp
            resolved_at = None

        elif status == "Resolved":
            resolved_at = timestamp

        cursor = conn.execute("""
            UPDATE incidents
            SET status = ?,
                acknowledged_at = ?,
                resolved_at = ?
            WHERE id = ?
        """, (
            status,
            acknowledged_at,
            resolved_at,
            incident_id,
        ))

        conn.commit()
        return cursor.rowcount == 1


initialize_database()
