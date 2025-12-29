SELECT
    s.store__name AS store_name,
    s.store__id AS store_id,
    cf._dlt_list_idx as hour,
    CASE
        WHEN cf._dlt_list_idx < 10 THEN '0' || CAST(cf._dlt_list_idx AS VARCHAR) || ':00'
        ELSE CAST(cf._dlt_list_idx AS VARCHAR) || ':00'
    END as hour_label,
    ROUND(COALESCE(cf.value, cf.value__v_double, 0) * 100, 0) as busyness_pct,
    EXTRACT(HOUR FROM CURRENT_TIMESTAMP) as current_hour
FROM salling_food_waste_pipeline.food_waste_stores s
JOIN salling_food_waste_pipeline.food_waste_stores__store__hours h
    ON s._dlt_id = h._dlt_parent_id
    AND h.date = CURRENT_DATE::VARCHAR
    AND h.type = 'store'
JOIN salling_food_waste_pipeline.food_waste_stores__store__hours__customer_flow cf
    ON h._dlt_id = cf._dlt_parent_id
ORDER BY s.store__name, cf._dlt_list_idx

