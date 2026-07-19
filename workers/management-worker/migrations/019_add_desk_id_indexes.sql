-- Reserved migration number. Tenant columns are added by later migrations, so
-- their indexes are created by 032_add_desk_id_indexes.sql after those columns
-- exist on a clean database.
SELECT 1;
