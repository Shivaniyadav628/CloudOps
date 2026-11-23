
import pytest

import app.services.database as database


@pytest.fixture
def setup_database(tmp_path, monkeypatch):
    """Create an isolated SQLite database for each test."""
    test_db_path = tmp_path / "test_cloudops.db"

    monkeypatch.setattr(
        database,
        "DB_PATH",
        test_db_path
    )

    database.initialize_database()

    return test_db_path


def sample_incident(
    resource="Memory",
    usage_percent=85.5,
    severity="Warning"
):
    return {
        "resource": resource,
        "usage_percent": usage_percent,
        "severity": severity,
        "message": f"{resource} usage is high.",
        "recommendation": f"Investigate {resource.lower()} usage."
    }


# --------------------------------------------------
# DATABASE INITIALIZATION TESTS
# --------------------------------------------------

def test_initialize_database_creates_incidents_table(setup_database):

    with database.get_connection() as conn:
        tables = conn.execute("""
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
        """).fetchall()

    table_names = [table[0] for table in tables]

    assert "incidents" in table_names


def test_database_contains_lifecycle_columns(setup_database):

    with database.get_connection() as conn:
        columns = conn.execute(
            "PRAGMA table_info(incidents)"
        ).fetchall()

    column_names = [column[1] for column in columns]

    assert "status" in column_names
    assert "acknowledged_at" in column_names
    assert "resolved_at" in column_names


# --------------------------------------------------
# INCIDENT STORAGE TESTS
# --------------------------------------------------

def test_save_incident(setup_database):

    database.save_incidents([
        sample_incident()
    ])

    history = database.get_incident_history()

    assert len(history) == 1
    assert history[0]["resource"] == "Memory"
    assert history[0]["usage_percent"] == 85.5
    assert history[0]["status"] == "Open"


def test_get_incident_by_id(setup_database):

    database.save_incidents([
        sample_incident()
    ])

    incident = database.get_incident_by_id(1)

    assert incident is not None
    assert incident["id"] == 1
    assert incident["resource"] == "Memory"


def test_get_nonexistent_incident(setup_database):

    incident = database.get_incident_by_id(999)

    assert incident is None


# --------------------------------------------------
# INCIDENT STATUS TESTS
# --------------------------------------------------

def test_acknowledge_incident_updates_timestamp(setup_database):

    database.save_incidents([
        sample_incident()
    ])

    updated = database.update_incident_status(
        1,
        "Acknowledged"
    )

    incident = database.get_incident_by_id(1)

    assert updated is True
    assert incident["status"] == "Acknowledged"
    assert incident["acknowledged_at"] is not None
    assert incident["resolved_at"] is None


def test_resolve_incident_updates_timestamp(setup_database):

    database.save_incidents([
        sample_incident()
    ])

    updated = database.update_incident_status(
        1,
        "Resolved"
    )

    incident = database.get_incident_by_id(1)

    assert updated is True
    assert incident["status"] == "Resolved"
    assert incident["resolved_at"] is not None


def test_reopen_incident_resets_timestamps(setup_database):

    database.save_incidents([
        sample_incident()
    ])

    database.update_incident_status(1, "Acknowledged")
    database.update_incident_status(1, "Resolved")

    updated = database.update_incident_status(
        1,
        "Open"
    )

    incident = database.get_incident_by_id(1)

    assert updated is True
    assert incident["status"] == "Open"
    assert incident["acknowledged_at"] is None
    assert incident["resolved_at"] is None


def test_update_nonexistent_incident(setup_database):

    updated = database.update_incident_status(
        999,
        "Resolved"
    )

    assert updated is False


def test_invalid_incident_status_raises_error(setup_database):

    with pytest.raises(ValueError):
        database.update_incident_status(
            1,
            "Invalid"
        )


# --------------------------------------------------
# DUPLICATE INCIDENT TESTS
# --------------------------------------------------

def test_duplicate_active_incident_is_updated(setup_database):

    database.save_incidents([
        sample_incident(
            resource="CPU",
            usage_percent=85
        )
    ])

    database.save_incidents([
        sample_incident(
            resource="CPU",
            usage_percent=95,
            severity="Critical"
        )
    ])

    history = database.get_incident_history()

    assert len(history) == 1
    assert history[0]["resource"] == "CPU"
    assert history[0]["usage_percent"] == 95
    assert history[0]["severity"] == "Critical"


def test_resolved_incident_allows_new_incident(setup_database):

    database.save_incidents([
        sample_incident(resource="Disk")
    ])

    database.update_incident_status(
        1,
        "Resolved"
    )

    database.save_incidents([
        sample_incident(
            resource="Disk",
            usage_percent=96,
            severity="Critical"
        )
    ])

    history = database.get_incident_history()

    assert len(history) == 2
    assert history[0]["status"] == "Open"
    assert history[0]["usage_percent"] == 96
    assert history[1]["status"] == "Resolved"
