WITH columns_info AS (
    SELECT table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public'
),
foreign_keys AS (
    SELECT tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
),
primary_keys AS (
    SELECT tc.table_schema,
        tc.table_name,
        kcu.column_name
    FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
),
unique_constraints AS (
    SELECT tc.table_schema,
        tc.table_name,
        kcu.column_name
    FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
),
composite_unique_constraints AS (
    SELECT tc.table_schema,
           tc.table_name,
           tc.constraint_name,
           array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS composite_unique_columns
    FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
    GROUP BY tc.table_schema, tc.table_name, tc.constraint_name
    HAVING count(kcu.column_name) > 1 -- Only select composite unique constraints
),
check_constraints AS (
    SELECT tc.table_schema,
        tc.table_name,
        cc.check_clause
    FROM information_schema.table_constraints AS tc
        JOIN information_schema.check_constraints AS cc ON tc.constraint_name = cc.constraint_name
        AND tc.table_schema = cc.constraint_schema
    WHERE tc.constraint_type = 'CHECK'
)
SELECT c.table_name,
    json_agg(
        json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable,
            'column_default', c.column_default,
            'primary_key', (pk.column_name IS NOT NULL),
            'unique', (uc.column_name IS NOT NULL),
            'foreign_key', CASE
                WHEN fk.foreign_table_name IS NOT NULL THEN json_build_object(
                    'foreign_table_name', fk.foreign_table_name,
                    'foreign_column_name', fk.foreign_column_name
                )
                ELSE NULL
            END
        )
        ORDER BY c.ordinal_position
    ) AS columns,
    (SELECT json_agg(check_clause)
     FROM check_constraints cc
     WHERE cc.table_schema = c.table_schema
       AND cc.table_name = c.table_name
    ) AS check_constraints,
    (SELECT json_agg(composite_unique_columns)
     FROM composite_unique_constraints cuc
     WHERE cuc.table_schema = c.table_schema
       AND cuc.table_name = c.table_name
    ) AS composite_unique_constraints
FROM columns_info c
    LEFT JOIN foreign_keys fk ON c.table_schema = fk.table_schema
    AND c.table_name = fk.table_name
    AND c.column_name = fk.column_name
    LEFT JOIN primary_keys pk ON c.table_schema = pk.table_schema
    AND c.table_name = pk.table_name
    AND c.column_name = pk.column_name
    LEFT JOIN unique_constraints uc ON c.table_schema = uc.table_schema
    AND c.table_name = uc.table_name
GROUP BY c.table_schema, c.table_name
ORDER BY c.table_name;
