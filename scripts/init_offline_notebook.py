#!/usr/bin/env python3
# ==============================================================================
# BSTM ELOS v1.0 - OFFLINE FIELD NOTEBOOK SCHEMA
# Creates a local SQLite database to preserve raw field data during network drops.
# ==============================================================================
import sqlite3
import os

def initialize_offline_cache():
    os.makedirs("01_raw_observations", exist_ok=True)
    conn = sqlite3.connect("01_raw_observations/offline_field_notebook.db")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS raw_observations (
            observation_id TEXT PRIMARY KEY,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            location TEXT NOT NULL,
            device_id TEXT,
            event_type TEXT NOT NULL,
            raw_metric_payload TEXT,
            operator_raw_notes TEXT NOT NULL,
            sync_status TEXT DEFAULT 'PENDING'
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cached_assumptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trial_id TEXT NOT NULL,
            assumption_text TEXT NOT NULL,
            initial_confidence INT CHECK(initial_confidence BETWEEN 1 AND 5),
            final_confidence INT CHECK(final_confidence BETWEEN 1 AND 5) DEFAULT NULL
        );
    """)

    conn.commit()
    conn.close()
    print("Offline SQLite engine initialized at '01_raw_observations/offline_field_notebook.db'")

if __name__ == "__main__":
    initialize_offline_cache()
