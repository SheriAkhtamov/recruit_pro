-- Скрипт для полной очистки базы данных recruit_pro
-- Выполнить через pgAdmin или psql

-- Отключить все соединения к базе
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'recruit_pro'
  AND pid <> pg_backend_pid();

-- Удалить базу если существует
DROP DATABASE IF EXISTS recruit_pro;

-- Создать новую пустую базу
CREATE DATABASE recruit_pro
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'Russian_Russia.1251'
    LC_CTYPE = 'Russian_Russia.1251'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

\c recruit_pro;

-- База готова для миграций
SELECT 'Database recruit_pro created and ready for migrations!' as status;
