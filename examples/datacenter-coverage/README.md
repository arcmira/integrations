# How often did indexed shows discuss datacenters?

Arcmira’s September 2026 research edition counted **40 videos in the first 30 days and 193 in the next 30**. This table breaks those totals into 24-hour intervals so you can see whether coverage clustered on a few days. It covers videos in the edition’s saved topic search. Changes in the indexed catalog can also affect the comparison.

[Explore the table in Datasette Lite](https://lite.datasette.io/?csv=https%3A%2F%2Fraw.githubusercontent.com%2Farcmira%2Fintegrations%2Fmaster%2Fexamples%2Fdatacenter-coverage%2Fcoverage.csv#/data/coverage) · [View the CSV](coverage.csv) · [Research methods and original data](https://arcmira.com/research/datacenters/2026-09/method#downloads)

In Datasette, choose **View and edit SQL** to reproduce the comparison.

```sql
select period, count(*) as days, sum(videos) as videos
from coverage
group by period
order by min(start_utc);
```

Each row counts distinct videos by publication time. The intervals follow the edition’s cutoff at 20:37:09.886 UTC. The start is inclusive and the end exclusive. A zero means that the saved inventory contains no matching video in that interval. `active_channels` counts distinct channels during that interval. A channel can appear on multiple days.

The full inventory contains 465 videos. Only 233 fall in the two comparison windows. For video IDs, channels and links to the recordings, consult the [original inventory](https://arcmira.com/research/datacenters/2026-09/data/topic-videos.json). Cite the [September 2026 edition](https://arcmira.com/research/datacenters/2026-09) when using these counts.

## Reproduce the table

From this directory, run the following with Python 3.8 or later. The script verifies the original file’s SHA-256 before writing the CSV.

```sh
curl -fsSLo topic-videos.json https://arcmira.com/research/datacenters/2026-09/data/topic-videos.json
python3 build.py topic-videos.json > rebuilt.csv
diff coverage.csv rebuilt.csv
```
