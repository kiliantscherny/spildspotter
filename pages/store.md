---
title: Store Details
full_width: true
---

<LastRefreshed/>

<div style="display:flex;gap:1rem;margin-bottom:1rem;">
    <a href="/" style="padding:0.5rem 1rem;background:#6b7280;color:white;text-decoration:none;border-radius:0.25rem;font-weight:500;">Overview</a>
    <a href="/store" style="padding:0.5rem 1rem;background:#8b5cf6;color:white;text-decoration:none;border-radius:0.25rem;font-weight:500;">Store Details</a>
</div>

# Store Details

Select a store to view its current clearance inventory, typical busyness patterns throughout the day, and detailed product information.

```sql store_list
SELECT DISTINCT
    store_name,
    store_brand || ' - ' || store_name || ' (' || store_address_city || ')' AS store_label
FROM stores
ORDER BY store_brand, store_name
```

```sql default_store
SELECT COALESCE(
    (SELECT store_name FROM stores WHERE store_name = 'føtex Fisketorvet, København' LIMIT 1),
    (SELECT store_name FROM stores ORDER BY store_brand, store_name LIMIT 1)
) as default_store_name
```

<Dropdown
    name=store_filter
    data={store_list}
    value=store_name
    label=store_label
    title="Select a Store"
    defaultValue={default_store[0].default_store_name}
/>

{#if inputs.store_filter.value}

## {inputs.store_filter.value}

```sql selected_store_info
SELECT
    store_name,
    store_brand,
    store_address_city as city,
    store_address_zip,
    store_address_street,
    hours_today,
    hours_tomorrow,
    open_status,
    busyness,
    customer_flow_pct,
    COUNT(*) as item_count
FROM clearances
WHERE store_name = '${inputs.store_filter.value}'
GROUP BY 1,2,3,4,5,6,7,8,9,10
LIMIT 1
```

<Grid cols=4>
<BigValue
    data={selected_store_info}
    value=item_count
    title="Clearance Items"
/>
<BigValue
    data={selected_store_info}
    value=open_status
    title="Status"
/>
<BigValue
    data={selected_store_info}
    value=busyness
    title="Busyness Now"
/>
<BigValue
    data={selected_store_info}
    value=hours_today
    title="Hours Today"
/>
</Grid>

## Store Busyness Throughout the Day

The chart below shows the typical customer flow pattern for **{inputs.store_filter.value}** throughout the day. The red dotted line indicates the current hour. Use this information to plan your visit during quieter periods, making it easier to browse clearance items without crowds.

**Note:** Busyness data represents typical patterns based on historical customer flow and may not reflect unusual circumstances or special events.

```sql filtered_hourly
SELECT
    hour,
    hour_label,
    busyness_pct,
    current_hour
FROM hourly_busyness
WHERE store_name = '${inputs.store_filter.value}'
ORDER BY hour
```

```sql current_hour_now
SELECT
    hour_label,
    current_hour
FROM hourly_busyness
WHERE store_name = '${inputs.store_filter.value}'
  AND hour = current_hour
LIMIT 1
```

<AreaChart data={filtered_hourly} x=hour_label y=busyness_pct yAxisTitle="Busyness %" xAxisTitle="Hour of Day" title="Typical Busyness Pattern for {inputs.store_filter.value}" fillColor=#8b5cf6 fillOpacity=0.3 line=true sort=false yMax=100 yFmt='#0.00"%"'>
    {#if current_hour_now.length > 0}
    <ReferenceLine x={current_hour_now[0].hour_label} label="Current Hour" labelPosition=aboveEnd color=#ef4444 lineWidth=3 lineType=dotted hideValue=true />
    {/if}
</AreaChart>

## Clearance Items

Browse all current clearance items at this store, organized by product category. The table shows pricing, discounts, available stock, and when each offer expires. Items are color-coded to help you quickly identify the best deals and most urgent offers.

**Understanding the data:**

- **Stock:** Available quantity (note: not real-time, treat as an indicator)
- **Hours Left:** Time remaining until the offer expires
- **Discount %:** Percentage reduction from original price

```sql all_clearances
SELECT
    product_description,
    product_categories_en as category,
    COALESCE(SPLIT_PART(product_categories_en, '>', 1), 'Uncategorized') as category_level_1,
    CASE
        WHEN LENGTH(product_categories_en) - LENGTH(REPLACE(product_categories_en, '>', '')) >= 1
        THEN SPLIT_PART(product_categories_en, '>', 2)
        ELSE NULL
    END as category_level_2,
    CASE
        WHEN LENGTH(product_categories_en) - LENGTH(REPLACE(product_categories_en, '>', '')) >= 2
        THEN SPLIT_PART(product_categories_en, '>', 3)
        ELSE NULL
    END as category_level_3,
    CASE
        WHEN LENGTH(product_categories_en) - LENGTH(REPLACE(product_categories_en, '>', '')) >= 3
        THEN SUBSTRING(product_categories_en,
            POSITION('>' IN product_categories_en) + 1 +
            POSITION('>' IN SUBSTRING(product_categories_en, POSITION('>' IN product_categories_en) + 1)) + 1 +
            POSITION('>' IN SUBSTRING(product_categories_en,
                POSITION('>' IN product_categories_en) + 1 +
                POSITION('>' IN SUBSTRING(product_categories_en, POSITION('>' IN product_categories_en) + 1)) + 1)))
        ELSE NULL
    END as category_level_4,
    store_brand,
    store_name,
    store_address_city as city,
    store_address_zip as postcode,
    offer_new_price,
    offer_original_price,
    ROUND(offer_percent_discount, 2) as discount_pct,
    CAST(offer_stock AS INTEGER) as stock,
    strftime(offer_end_time, '%Y-%m-%d %H:%M') as expires,
    ROUND(CAST(EXTRACT(EPOCH FROM (offer_end_time::TIMESTAMP - CURRENT_TIMESTAMP::TIMESTAMP)) / 3600.0 AS NUMERIC), 1) as hours_to_expiry,
    busyness,
    customer_flow_pct,
    CASE
        WHEN product_image IS NULL OR product_image = '' THEN '/spildspotter/product-images/placeholder.svg'
        WHEN product_image LIKE '%/image' THEN '/spildspotter/product-images/placeholder.svg'
        WHEN LENGTH(product_image) < 20 THEN '/spildspotter/product-images/placeholder.svg'
        ELSE '/spildspotter/product-images/' || SUBSTRING(MD5(product_image), 1, 16) || '.jpg'
    END as product_image_local
FROM clearances
WHERE offer_stock > 0
  AND store_name = '${inputs.store_filter.value}'
ORDER BY category_level_1, category_level_2, category_level_3, offer_end_time ASC
```

<DataTable data={all_clearances} title="Clearance Items at {inputs.store_filter.value}" search=true rowShading=true rows=20 groupBy=category_level_1 groupType=accordion groupsOpen=true subtotals=true subtotalRowColor=#f2f2f2 wrapTitles=true >
    <Column id=category_level_1 title="Category" colGroup=Category />
    <Column id=category_level_2 title="Subcategory Level 2" wrap=true colGroup=Category />
    <Column id=category_level_3 title="Subcategory Level 3" wrap=true colGroup=Category />
    <Column id=category_level_4 title="Subcategory Level 4" wrap=true colGroup=Category />
    <Column id=product_image_local contentType=image height=60px align=center title="Image" totalAgg='' colGroup=Product />
    <Column id=product_description title="Product" wrap=true totalAgg=countDistinct subtotalFmt='[=1]0 "item type";0 "item types"' colGroup=Product />
    <Column id=stock title="Stock" fmt="num0" contentType=colorscale scaleColor={['#ef4444', '#fbbf24', '#10b981']} totalAgg=sum subtotalFmt='Total: #.##0' colGroup=Product />
    <Column id=offer_new_price title="Price" fmt='#.##0,00 "kr."' totalAgg=mean subtotalFmt='Gns.: #.##0,00 "kr."' contentType=colorscale colorScale=positive colGroup=Price />
    <Column id=offer_original_price title="Was" fmt='#.##0,00 "kr."' totalAgg=mean subtotalFmt='Gns.: #.##0,00 "kr."' colGroup=Price />
    <Column id=discount_pct title="Discount" fmt='#0.00"%"' contentType=colorscale colorScale=positive totalAgg=mean subtotalFmt='Gns.: #0.00"%"' colGroup=Price />
    <Column id=expires title="Offer Ends At" fmt='%Y-%m-%d %H:%M' totalAgg='' colGroup=Time />
    <Column id=hours_to_expiry title="Hours Left" fmt='#0"h"' contentType=colorscale scaleColor={['#ef4444', '#fbbf24', '#10b981']} colorMin=0 colorMax=48 totalAgg='' colGroup=Time />
</DataTable>

{:else}

<Alert status=info>
Please select a store from the dropdown above to view its details.
</Alert>

{/if}
