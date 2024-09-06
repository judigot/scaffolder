WITH primary_keys AS (
    SELECT kcu.table_name,
        kcu.column_name
    FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
),
unique_keys AS (
    SELECT kcu.table_name,
        kcu.constraint_name,
        array_agg(
            kcu.column_name
            ORDER BY kcu.ordinal_position
        ) AS columns
    FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
    GROUP BY kcu.table_name,
        kcu.constraint_name
),
foreign_keys AS (
    SELECT kcu.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
),
check_constraints AS (
    SELECT tc.table_name,
        cc.check_clause
    FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        AND tc.table_schema = cc.constraint_schema
    WHERE tc.constraint_type = 'CHECK'
),
table_oids AS (
    SELECT c.relname AS table_name,
        c.oid AS table_oid
    FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
)
SELECT t.table_name,
    json_agg(
        json_build_object(
            'column_name',
            c.column_name,
            'data_type',
            c.data_type,
            'is_nullable',
            c.is_nullable,
            'column_default',
            c.column_default,
            'primary_key',
            (p.column_name IS NOT NULL),
            'unique',
            EXISTS (
                SELECT 1
                FROM unique_keys u
                WHERE u.table_name = c.table_name
                    AND c.column_name = ANY(u.columns)
                    AND array_length(u.columns, 1) = 1
            ),
            'foreign_key',
            CASE
                WHEN f.column_name IS NOT NULL THEN json_build_object(
                    'foreign_table_name',
                    f.foreign_table_name,
                    'foreign_column_name',
                    f.foreign_column_name
                )
                ELSE NULL
            END
        )
        ORDER BY c.ordinal_position
    ) AS columns,
    (
        SELECT json_agg(cc.check_clause)
        FROM check_constraints cc
        WHERE cc.table_name = t.table_name
    ) AS check_constraints,
    (
        SELECT json_agg(u.columns)
        FROM unique_keys u
        WHERE u.table_name = t.table_name
            AND array_length(u.columns, 1) > 1
    ) AS composite_unique_constraints
FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    LEFT JOIN primary_keys p ON p.table_name = c.table_name
    AND p.column_name = c.column_name
    LEFT JOIN foreign_keys f ON f.table_name = c.table_name
    AND f.column_name = c.column_name
    JOIN table_oids toid ON toid.table_name = t.table_name
WHERE t.table_schema = 'public'
GROUP BY t.table_name,
    toid.table_oid
ORDER BY t.table_name;