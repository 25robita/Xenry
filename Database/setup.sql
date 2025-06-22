-- DON'T RUN THIS FILE UNLESS YOU WANT TO OVERWRITE ALL THE DATA

drop table if exists user_sessions;
drop table if exists users;
drop table if exists tasks;
drop table if exists projects;
drop table if exists excluded_time_periods;
drop table if exists dependencies;


create table user_sessions (
    UUID text primary key,
    username text,
    expires date
);

create table users (
    username text primary key,
    password_hash text,
    display_name text,
    profile_photo blob
);

create table projects (
    UUID text primary key,
    owner_username text,
    name text,
    description text,
    excludedDays text -- something like X-XX-X-
);

create table excluded_time_periods (
    id int primary key,
    start_date date,
    end_date date,
    project_UUID text
);

create table tasks (
    UUID text primary key,
    name text,
    description text,
    duration_optimistic float,
    duration_normal float,
    duration_pessimistic float,
    start_date date,
    completion float,
    tag text,
    colour text,
    assigned_team_member text,
    is_milestone boolean
);

create table dependencies (
    id int primary key, 
    from_task_UUID text,
    to_task_UUID text
)