# Desert Water Research: Lake Havasu City & the Mohave Mountains

Live site: https://terminalgravity.github.io/desert-water-research/
This is a desk study. Runoff numbers are formula estimates, not measurements; no drone capture exists yet.

- `index.html`: the main study (built from `tools/index.src.html` and `tools/refs.json` by `python3 tools/build.py`)
- `protocol.html`: the open runoff validation protocol. `data/runoff_log_template.csv` is CC0.
- `tools/build_terrain.py`, `tools/build_hydro.py`: fetch USGS 3DEP elevation, compute the hillshade, D8 flow accumulation and catchments
- Text: CC BY 4.0. Logging template: CC0 1.0. Optional imagery: Sentinel-2 cloudless 2020 by EOX (CC BY-NC-SA 4.0).

Data contributions: open an issue with your CSV and method notes.
