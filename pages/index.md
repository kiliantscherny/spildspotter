---
title: Spild Spotter food waste dashboard
full_width: true
---

<LastRefreshed/>

Explore an overview or view details for a specific store.

<div style="display:flex;gap:1rem;margin-bottom:1rem;">
    <a href="/" style="padding:0.5rem 1rem;background:#8b5cf6;color:white;text-decoration:none;border-radius:0.25rem;font-weight:500;">Overview</a>
    <a href="/store" style="padding:0.5rem 1rem;background:#6b7280;color:white;text-decoration:none;border-radius:0.25rem;font-weight:500;">Store Details</a>
</div>

# Food Waste Clearance Items

**Reducing food waste from Danish supermarkets - Salling Group (Netto & Foetex)**

<Accordion class="text-white py-2 px-6 rounded-md bg-violet-950">
<AccordionItem title="About this app">

<Alert status="negative">
This app is <strong>not affiliated with Salling Group A/S</strong>. It is a personal project by <strong><a href="https://www.linkedin.com/in/kiliantscherny/" target="_blank">Kilian Tscherny</a></strong>.
</Alert>

<Alert status="warning">
This app is a work in progress and the data may not be completely accurate.
</Alert>

This app provides an interactive way to explore clearance item data from Salling Group stores (Bilka, Netto and Føtex) across Denmark. These are food items approaching their expiration date that are being sold at reduced prices to minimize food waste.

Data is refreshed daily and includes all of the available product data from the time of the last update.

The customer flow data shows how busy stores typically are at the current hour, helping you avoid crowds when shopping for clearance items.

</AccordionItem>

<AccordionItem title="About the food waste data">

The [Salling Group Food Waste API](https://developer.sallinggroup.com/api-reference#apis-food-waste) provides access to over **thousands of discounted items daily** across Føtex, Netto, and Bilka stores throughout Denmark. This API enables customers to find heavily discounted products nearing their expiration dates, helping to reduce food waste while saving money.

**How it works:**

- Clearance items are marked down with a discount percentage and a new price
- The data also includes the number of items in stock in each store at the time of the last update.
- Store information includes addresses, coordinates, and opening hours

</AccordionItem>
</Accordion>

## Key Statistics

The statistics below reflect current clearance offers across all selected stores. Values update as you adjust the filters above.

```sql total_items
SELECT COUNT(*) as total_clearance_items
FROM clearances
WHERE store_address_city IN ${inputs.city_filter.value}
  AND ${inputs.dimension_filter}
```

```sql total_stores
SELECT COUNT(DISTINCT store_id) as total_stores
FROM clearances
WHERE store_address_city IN ${inputs.city_filter.value}
  AND ${inputs.dimension_filter}
```

```sql total_brands
SELECT store_brand, COUNT(DISTINCT store_id) as store_count
FROM clearances
WHERE store_address_city IN ${inputs.city_filter.value}
  AND ${inputs.dimension_filter}
GROUP BY store_brand
```

```sql avg_discount
SELECT
    ROUND(AVG(offer_percent_discount), 1) as avg_discount,
    ROUND(SUM(offer_stock * offer_original_price), 0) as total_original_value,
    ROUND(SUM(offer_stock * offer_new_price), 0) as total_discounted_value,
    ROUND(SUM(offer_stock * (offer_original_price - offer_new_price)), 0) as total_savings
FROM clearances
WHERE offer_percent_discount IS NOT NULL
  AND store_address_city IN ${inputs.city_filter.value}
  AND ${inputs.dimension_filter}
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

Use the map below to visualize stores with clearance items. The **Busyness Heatmap** shows how crowded each store typically is at the current hour, while the **Stores by Brand** view distinguishes between the different brands' locations. Bubble size indicates the number of clearance items available at each store.

**Filters:** Use the dimension grid and city dropdown below to refine your view. All filters apply to the entire page, including statistics, maps, and charts.

```sql city_options
SELECT DISTINCT store_address_city FROM clearances ORDER BY store_address_city
```

<Dropdown
    name=city_filter
    data={city_options}
    value=store_address_city
    multiple=true
    selectAllByDefault=true
    title="Filter by City"
/>

```sql filter_dimensions
SELECT
    open_status,
    busyness,
    store_brand,
    COUNT(*) as item_count
FROM clearances
WHERE store_address_city IN ${inputs.city_filter.value}
GROUP BY open_status, busyness, store_brand
```

<DimensionGrid
    data={filter_dimensions}
    name=dimension_filter
    metric='sum(item_count)'
    metricLabel="Items"
    multiple
/>

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
  AND store_address_city IN ${inputs.city_filter.value}
  AND ${inputs.dimension_filter}
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
```

<Tabs>
<Tab label="Busyness Heatmap">

<BubbleMap
data={store_locations}
lat=store_latitude
long=store_longitude
pointName=store_name
size=clearance_count
value=customer_flow_pct
height=500
colorPalette={['#10b981', '#22c55e', '#06b6d4', '#8b5cf6', '#ef4444']}
tooltipType=hover
tooltip={[
{id: 'store_name', showColumnName: false, valueClass: 'text-xl font-semibold'},
{id: 'store_address_street', showColumnName: false},
{id: 'store_address_zip', showColumnName: false},
{id: 'store_address_city', showColumnName: false},
{id: 'store_brand', title: 'Brand', showColumnName: true, valueClass: 'font-bold'},
{id: 'open_status', title: 'Status', showColumnName: true, valueClass: 'font-bold'},
{id: 'busyness', title: 'Busyness Now', showColumnName: true, valueClass: 'font-bold'},
{id: 'customer_flow_pct', title: 'Crowd Level', showColumnName: true, fmt: '#0.00"%"'},
{id: 'hours_today', title: 'Today', showColumnName: true},
{id: 'hours_tomorrow', title: 'Tomorrow', showColumnName: true},
{id: 'clearance_count', title: 'Clearance Items', showColumnName: true, valueClass: 'font-bold'}
]}
legend=true
/>

</Tab>
<Tab label="Stores by Brand">

<BubbleMap
data={store_locations}
lat=store_latitude
long=store_longitude
pointName=store_name
size=clearance_count
value=store_brand
height=500
colorPalette={['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']}
tooltipType=hover
tooltip={[
{id: 'store_name', showColumnName: false, valueClass: 'text-xl font-semibold'},
{id: 'store_address_street', showColumnName: false},
{id: 'store_address_zip', showColumnName: false},
{id: 'store_address_city', showColumnName: false},
{id: 'store_brand', title: 'Brand', showColumnName: true, valueClass: 'font-bold'},
{id: 'open_status', title: 'Status', showColumnName: true, valueClass: 'font-bold'},
{id: 'busyness', title: 'Busyness Now', showColumnName: true, valueClass: 'font-bold'},
{id: 'customer_flow_pct', title: 'Crowd Level', showColumnName: true, fmt: '#0.00"%"'},
{id: 'hours_today', title: 'Today', showColumnName: true},
{id: 'hours_tomorrow', title: 'Tomorrow', showColumnName: true},
{id: 'clearance_count', title: 'Clearance Items', showColumnName: true, valueClass: 'font-bold'}
]}
legend=true
/>

</Tab>
</Tabs>

## Category Flow

This Sankey diagram visualizes how clearance items are distributed across product categories and subcategories. The width of each flow represents the number of items in that category. This helps identify which types of products are most commonly discounted, revealing patterns in what approaches expiration dates across different store categories.

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
      AND store_address_city IN ${inputs.city_filter.value}
      AND ${inputs.dimension_filter}
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

## Clearance Distribution

Compare clearance patterns across store brands and discount levels. These charts help you understand where to find the most items and what discount ranges are most common.

```sql discount_by_brand
SELECT
    store_brand,
    MIN(offer_percent_discount) as min,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY offer_percent_discount) as q1,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY offer_percent_discount) as median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY offer_percent_discount) as q3,
    MAX(offer_percent_discount) as max
FROM clearances
WHERE offer_percent_discount IS NOT NULL
  AND store_address_city IN ${inputs.city_filter.value}
  AND ${inputs.dimension_filter}
GROUP BY store_brand
ORDER BY median DESC
```

```sql items_by_brand
SELECT
    store_brand,
    COUNT(*) as item_count,
    ROUND(AVG(offer_percent_discount), 1) as avg_discount,
    ROUND(SUM(offer_stock), 0) as total_stock
FROM clearances
WHERE store_address_city IN ${inputs.city_filter.value}
  AND ${inputs.dimension_filter}
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
  AND store_address_city IN ${inputs.city_filter.value}
  AND ${inputs.dimension_filter}
GROUP BY 1, 2
ORDER BY sort_order
```

<Grid cols=3>
<BarChart
data={items_by_brand}
x=store_brand
y=item_count
title="Clearance Items by Store Brand"
colorPalette={['#8b5cf6']}
swapXY=true
/>

<BarChart
data={discount_distribution}
x=discount_range
y=item_count
title="Discount Distribution by Percentage Range"
sort=false
colorPalette={['#3b82f6']}/>

<BoxPlot
title="Discount Distribution by Brand"
data={discount_by_brand}
name=store_brand
intervalBottom=q1
midpoint=median
intervalTop=q3
min=min
max=max
yFmt='#0.0"%"'
color=store_brand
yMin=0
/>
</Grid>
