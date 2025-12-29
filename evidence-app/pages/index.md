---
title: Salling Food Waste Dashboard
full_width: true
---

<LastRefreshed/>

<div style="display:flex;gap:1rem;margin-bottom:1rem;">
    <a href="/" style="padding:0.5rem 1rem;background:#22c55e;color:white;text-decoration:none;border-radius:0.25rem;font-weight:500;">Overview</a>
    <a href="/store" style="padding:0.5rem 1rem;background:#6b7280;color:white;text-decoration:none;border-radius:0.25rem;font-weight:500;">Store Details</a>
</div>

# Food Waste Clearance Items

**Reducing food waste from Danish supermarkets - Salling Group (Netto & Foetex)**

<Accordion>
<AccordionItem title="About this dashboard">

This dashboard displays real-time clearance data from Salling Group stores (Netto and Foetex) across Denmark. These are food items approaching their expiration date that are being sold at reduced prices to minimize food waste.

**Data Source:** [Salling Group Food Waste API](https://developer.sallinggroup.com/api-reference)  
**Stores Covered:** Netto & Foetex locations throughout Denmark

The customer flow data shows how busy stores typically are at the current hour, helping you avoid crowds when shopping for clearance items.

</AccordionItem>
</Accordion>

## Key Statistics

```sql total_items
SELECT COUNT(*) as total_clearance_items FROM clearances
```

```sql total_stores
SELECT COUNT(DISTINCT store_id) as total_stores FROM stores
```

```sql total_brands
SELECT store_brand, COUNT(DISTINCT store_id) as store_count FROM stores GROUP BY store_brand
```

```sql avg_discount
SELECT
    ROUND(AVG(offer_percent_discount), 1) as avg_discount,
    ROUND(SUM(offer_stock * offer_original_price), 0) as total_original_value,
    ROUND(SUM(offer_stock * offer_new_price), 0) as total_discounted_value,
    ROUND(SUM(offer_stock * (offer_original_price - offer_new_price)), 0) as total_savings
FROM clearances
WHERE offer_percent_discount IS NOT NULL
```

<BigValue
    data={total_items}
    value=total_clearance_items
    title="Total Clearance Items"
    fmt="num0"
/>

<BigValue
    data={total_stores}
    value=total_stores
    title="Stores with Clearances"
    fmt="num0"
/>

<BigValue
    data={avg_discount}
    value=avg_discount
    title="Average Discount"
    fmt='#0"%"'
/>

<BigValue
    data={avg_discount}
    value=total_savings
    title="Potential Savings"
    fmt='#,##0 "kr."'
/>

## Store Locations Map

```sql open_status_options
SELECT DISTINCT open_status FROM clearances ORDER BY open_status
```

```sql busyness_map_options
SELECT DISTINCT busyness FROM clearances ORDER BY busyness
```

<Grid cols=2>
<Dropdown
    name=open_status_filter
    data={open_status_options}
    value=open_status
    multiple=true
    selectAllByDefault=true
    title="Filter by Store Status"
/>

<Dropdown
    name=busyness_map_filter
    data={busyness_map_options}
    value=busyness
    multiple=true
    selectAllByDefault=true
    title="Filter by Busyness"
/>
</Grid>

```sql store_locations
SELECT
    store_name,
    store_brand,
    store_address_city,
    store_address_street,
    store_address_zip,
    store_latitude,
    store_longitude,
    hours_today,
    hours_tomorrow,
    open_status,
    busyness,
    customer_flow_pct,
    COUNT(*) as clearance_count
FROM clearances
WHERE store_latitude IS NOT NULL
  AND store_longitude IS NOT NULL
  AND store_latitude != 0
  AND store_longitude != 0
  AND open_status IN ${inputs.open_status_filter.value}
  AND busyness IN ${inputs.busyness_map_filter.value}
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
```

<BubbleMap
data={store_locations}
lat=store_latitude
long=store_longitude
pointName=store_name
size=clearance_count
value=customer_flow_pct
height=500
colorPalette={['#22c55e', '#84cc16', '#facc15', '#f97316', '#ef4444']}
tooltipType=click
tooltip={[
{id: 'store_name', showColumnName: false, valueClass: 'text-xl font-semibold'},
{id: 'store_brand', showColumnName: false, valueClass: 'text-l'},
{id: 'store_address_street', showColumnName: false},
{id: 'store_address_zip', showColumnName: false},
{id: 'store_address_city', showColumnName: false},
{id: 'open_status', title: 'Status', showColumnName: true, valueClass: 'font-bold'},
{id: 'busyness', title: 'Busyness Now', showColumnName: true, valueClass: 'font-bold'},
{id: 'customer_flow_pct', title: 'Crowd Level', showColumnName: true, fmt: '#0.00"%"'},
{id: 'hours_today', title: 'Today', showColumnName: true},
{id: 'hours_tomorrow', title: 'Tomorrow', showColumnName: true},
{id: 'clearance_count', title: 'Clearance Items', showColumnName: true, valueClass: 'font-bold'}
]}
legend=true
/>

## Category Flow

This diagram shows how clearance items flow through the category hierarchy.

```sql category_flow
WITH parsed_categories AS (
    SELECT
        COALESCE(SPLIT_PART(product_categories_en, '>', 1), 'Uncategorized') as level_1,
        CASE
            WHEN LENGTH(product_categories_en) - LENGTH(REPLACE(product_categories_en, '>', '')) >= 1
            THEN SPLIT_PART(product_categories_en, '>', 2)
            ELSE NULL
        END as level_2,
        CASE
            WHEN LENGTH(product_categories_en) - LENGTH(REPLACE(product_categories_en, '>', '')) >= 2
            THEN SPLIT_PART(product_categories_en, '>', 3)
            ELSE NULL
        END as level_3
    FROM clearances
    WHERE product_categories_en IS NOT NULL
)
SELECT
    level_1 as source,
    COALESCE(level_2, 'No Subcategory') as target,
    COUNT(*) as value
FROM parsed_categories
WHERE level_2 IS NOT NULL
GROUP BY level_1, level_2
HAVING COUNT(*) >= 3

UNION ALL

SELECT
    level_2 as source,
    COALESCE(level_3, 'No Further Subcategory') as target,
    COUNT(*) as value
FROM parsed_categories
WHERE level_2 IS NOT NULL
  AND level_3 IS NOT NULL
GROUP BY level_2, level_3
HAVING COUNT(*) >= 3

ORDER BY value DESC
```

<SankeyDiagram
    data={category_flow}
    sourceCol=source
    targetCol=target
    valueCol=value
    nodeAlign=justify
    nodeGap=2
    nodeLabels=full
    chartAreaHeight=900
/>

```sql items_by_brand
SELECT
    store_brand,
    COUNT(*) as item_count,
    ROUND(AVG(offer_percent_discount), 1) as avg_discount,
    ROUND(SUM(offer_stock), 0) as total_stock
FROM clearances
GROUP BY store_brand
ORDER BY item_count DESC
```

```sql discount_distribution
SELECT
    CASE
        WHEN offer_percent_discount < 20 THEN '0-20%'
        WHEN offer_percent_discount < 30 THEN '20-30%'
        WHEN offer_percent_discount < 40 THEN '30-40%'
        WHEN offer_percent_discount < 50 THEN '40-50%'
        WHEN offer_percent_discount < 60 THEN '50-60%'
        WHEN offer_percent_discount < 70 THEN '60-70%'
        ELSE '70%+'
    END as discount_range,
    CASE
        WHEN offer_percent_discount < 20 THEN 1
        WHEN offer_percent_discount < 30 THEN 2
        WHEN offer_percent_discount < 40 THEN 3
        WHEN offer_percent_discount < 50 THEN 4
        WHEN offer_percent_discount < 60 THEN 5
        WHEN offer_percent_discount < 70 THEN 6
        ELSE 7
    END as sort_order,
    COUNT(*) as item_count
FROM clearances
WHERE offer_percent_discount IS NOT NULL
GROUP BY 1, 2
ORDER BY sort_order
```

<Grid cols=2>
<BarChart
data={items_by_brand}
x=store_brand
y=item_count
title="Clearance Items by Store Brand"
colorPalette={['#22c55e', '#f97316']}
swapXY=true
/>

<BarChart
data={discount_distribution}
x=discount_range
y=item_count
title="Discount Distribution"
sort=false
colorPalette={['#22c55e', '#f97316']}/>
</Grid>
