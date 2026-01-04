SELECT
    s.id AS store_id,
    s.name AS store_name,
    s.brand AS store_brand,
    s.address__street AS store_address_street,
    s.address__city AS store_address_city,
    s.address__zip AS store_address_zip,
    s.latitude AS store_latitude,
    s.longitude AS store_longitude,
    s.type AS store_type
FROM salling_data.all_stores s
INNER JOIN salling_data.food_waste_stores fw
    ON s.id = fw.store__id
