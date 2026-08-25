-- PostgreSQL schema for crictoss
-- Run this once against the PostgreSQL database to create all tables.

CREATE TABLE IF NOT EXISTS tblusertype (
    id SERIAL PRIMARY KEY,
    usertype TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tabregistration (
    id SERIAL PRIMARY KEY,
    firstname TEXT,
    middlename TEXT,
    lastname TEXT,
    logintype TEXT,
    emailid TEXT,
    password TEXT,
    mobileno TEXT,
    createdate TIMESTAMP,
    updateddate TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tblseries (
    id SERIAL PRIMARY KEY,
    seriesname TEXT,
    seriestype TEXT,
    betStartTime TIMESTAMP,
    betEndTime TIMESTAMP,
    created_date TIMESTAMP,
    updated_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tblseriestype (
    id SERIAL PRIMARY KEY,
    seriestype TEXT
);

CREATE TABLE IF NOT EXISTS tblmatchformat (
    id SERIAL PRIMARY KEY,
    formatname TEXT
);

CREATE TABLE IF NOT EXISTS tblschedule (
    id SERIAL PRIMARY KEY,
    seriesid INT,
    seriesname TEXT,
    matchformatid INT,
    matchFormat TEXT,
    startDate TIMESTAMP,
    endDate TIMESTAMP,
    teamName1 TEXT,
    teamName2 TEXT,
    tosswonstatus BOOLEAN DEFAULT false,
    tossstatus BOOLEAN DEFAULT false,
    createddate TIMESTAMP,
    updateddate TIMESTAMP
);


ALTER TABLE tblschedule
ALTER COLUMN tosswonstatus TYPE TEXT;

CREATE TABLE IF NOT EXISTS "tblContactUS" (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    emailid TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS match_votes (
    id SERIAL PRIMARY KEY,
    match_id INT NOT NULL,
    team_id TEXT NOT NULL,
    user_id INT DEFAULT NULL,
    guest_id TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);