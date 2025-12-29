SELECT
    s.store__id AS store_id,
    s.store__name AS store_name,
    s.store__brand AS store_brand,
    s.store__address__street AS store_address_street,
    s.store__address__city AS store_address_city,
    s.store__address__zip AS store_address_zip,
    s.store__latitude AS store_latitude,
    s.store__longitude AS store_longitude,
    s.store__type AS store_type
FROM salling_food_waste_pipeline.food_waste_stores s

