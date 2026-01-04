SELECT
    -- Store data from all_stores table (source of truth)
    s.id AS store_id,
    s.name AS store_name,
    s.brand AS store_brand,
    s.address__street AS store_address_street,
    s.address__city AS store_address_city,
    s.address__zip AS store_address_zip,
    s.latitude AS store_latitude,
    s.longitude AS store_longitude,

    -- Clearance/product data from food_waste_stores
    c.product__description AS product_description,
    c.product__categories__da AS product_categories_da,
    c.product__categories__en AS product_categories_en,
    c.product__ean AS product_ean,
    c.product__image AS product_image,
    COALESCE(c.offer__new_price, c.offer__new_price__v_double) AS offer_new_price,
    c.offer__original_price AS offer_original_price,
    c.offer__percent_discount AS offer_percent_discount,
    c.offer__discount AS offer_discount,
    c.offer__stock AS offer_stock,
    c.offer__stock_unit AS offer_stock_unit,
    c.offer__currency AS offer_currency,
    c.offer__start_time AS offer_start_time,
    c.offer__end_time AS offer_end_time,
    c.offer__last_update AS offer_last_update,

    -- Store hours and busyness data from all_stores
    h_today.open,
    h_today.closed,
    h_tomorrow.open,
    h_tomorrow.closed,
    cf.value,
    cf.value__v_double,

    -- Today's hours
    CASE
        WHEN h_today.closed = true THEN 'Closed'
        WHEN h_today.open IS NOT NULL AND h_today.close IS NOT NULL THEN
            strftime(h_today.open, '%H:%M') || ' - ' || strftime(h_today.close, '%H:%M')
        ELSE 'Not available'
    END AS hours_today,
    -- Tomorrow's hours
    CASE
        WHEN h_tomorrow.closed = true THEN 'Closed'
        WHEN h_tomorrow.open IS NOT NULL AND h_tomorrow.close IS NOT NULL THEN
            strftime(h_tomorrow.open, '%H:%M') || ' - ' || strftime(h_tomorrow.close, '%H:%M')
        ELSE 'Not available'
    END AS hours_tomorrow,
    -- Is the store open right now?
    CASE
        WHEN h_today.closed = true THEN 'Closed now'
        WHEN h_today.open IS NULL OR h_today.close IS NULL THEN 'Unknown'
        WHEN CURRENT_TIMESTAMP >= h_today.open AND CURRENT_TIMESTAMP <= h_today.close THEN 'Open now'
        ELSE 'Closed now'
    END AS open_status,
    -- Customer flow (busyness) for current hour
    ROUND(COALESCE(cf.value, cf.value__v_double, 0) * 100, 0) AS customer_flow_pct,
    -- Busyness category
    CASE
        WHEN h_today.closed = true OR open_status = 'Closed now' THEN 'Closed'
        WHEN COALESCE(cf.value, cf.value__v_double, 0) < 0.25 THEN 'Quiet'
        WHEN COALESCE(cf.value, cf.value__v_double, 0) < 0.50 THEN 'Moderate'
        WHEN COALESCE(cf.value, cf.value__v_double, 0) < 0.75 THEN 'Busy'
        ELSE 'Very Busy'
    END AS busyness
FROM salling_data.all_stores s
INNER JOIN salling_data.food_waste_stores fw
    ON s.id = fw.store__id
INNER JOIN salling_data.food_waste_stores__clearances c
    ON fw._dlt_id = c._dlt_parent_id
LEFT JOIN salling_data.all_stores__hours h_today
    ON s._dlt_id = h_today._dlt_parent_id
    AND h_today.date = CURRENT_DATE::VARCHAR
    AND h_today.type = 'store'
LEFT JOIN salling_data.all_stores__hours h_tomorrow
    ON s._dlt_id = h_tomorrow._dlt_parent_id
    AND h_tomorrow.date = CAST((CURRENT_DATE + INTERVAL 1 DAY)::DATE AS VARCHAR)
    AND h_tomorrow.type = 'store'
LEFT JOIN salling_data.all_stores__hours__customer_flow cf
    ON h_today._dlt_id = cf._dlt_parent_id
    AND cf._dlt_list_idx = EXTRACT(HOUR FROM CURRENT_TIMESTAMP)
