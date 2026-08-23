UPDATE `comments`
SET `content` = trim(COALESCE((
  SELECT group_concat(para_text, CHAR(10))
  FROM (
    SELECT
      CAST(para.key AS INTEGER) AS para_ord,
      (
        SELECT group_concat(piece, '')
        FROM (
          SELECT
            CAST(inline.key AS INTEGER) AS inline_ord,
            CASE json_extract(inline.value, '$.type')
              WHEN 'hardBreak' THEN CHAR(10)
              WHEN 'image' THEN (
                CASE
                  WHEN json_extract(inline.value, '$.attrs.src') IS NOT NULL
                   AND json_extract(inline.value, '$.attrs.src') != ''
                  THEN CHAR(10) || json_extract(inline.value, '$.attrs.src') || CHAR(10)
                  ELSE ''
                END
              )
              WHEN 'text' THEN (
                COALESCE(json_extract(inline.value, '$.text'), '') ||
                CASE
                  WHEN (
                    SELECT json_extract(m.value, '$.attrs.href')
                    FROM json_each(COALESCE(json_extract(inline.value, '$.marks'), '[]')) AS m
                    WHERE json_extract(m.value, '$.type') = 'link'
                    LIMIT 1
                  ) IS NOT NULL
                  AND (
                    SELECT json_extract(m.value, '$.attrs.href')
                    FROM json_each(COALESCE(json_extract(inline.value, '$.marks'), '[]')) AS m
                    WHERE json_extract(m.value, '$.type') = 'link'
                    LIMIT 1
                  ) != COALESCE(json_extract(inline.value, '$.text'), '')
                  THEN ' ' || (
                    SELECT json_extract(m.value, '$.attrs.href')
                    FROM json_each(COALESCE(json_extract(inline.value, '$.marks'), '[]')) AS m
                    WHERE json_extract(m.value, '$.type') = 'link'
                    LIMIT 1
                  )
                  ELSE ''
                END
              )
              ELSE ''
            END AS piece
          FROM json_each(COALESCE(json_extract(para.value, '$.content'), '[]')) AS inline
          ORDER BY CAST(inline.key AS INTEGER)
        )
      ) AS para_text
    FROM json_each(COALESCE(json_extract(`comments`.`content`, '$.content'), '[]')) AS para
    ORDER BY CAST(para.key AS INTEGER)
  )
), ''), CHAR(10) || CHAR(13) || ' ')
WHERE json_valid(`content`)
  AND json_type(`content`) = 'object'
  AND json_extract(`content`, '$.type') = 'doc';
