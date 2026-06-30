# FutureGrid

Data visualization platform for exploring jobs and careers impacted by AI.

## Overview

FutureGrid provides interactive visualizations that help users understand how artificial intelligence is reshaping the job market across industries, roles, and regions. The platform aggregates career impact data and presents it through intuitive charts, graphs, and dashboards.

## Features

- Interactive job impact visualizations
- Career trend analysis across industries
- AI disruption heatmaps by sector and region
- Skill transition pathways
- Historical and predictive employment data views

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

The production build is a static export written to the `out/` directory, ready for any static host.

### Data Snapshot

```bash
npm run build:data
```

The data scripts load `.env` / `.env.local` automatically via Next's environment loader. Set `BLS_API_KEY` there to enrich occupations with BLS OEWS employment and wage data, and `CENSUS_API_KEY` to refresh the optional US Census AI adoption proxy.

To refresh only supplemental AI usage/adoption proxies:

```bash
npm run build:proxies
```

## Tech Stack

- **Frontend**: React / Next.js
- **Visualization**: D3.js / Chart.js
- **Styling**: Tailwind CSS

## Project Status

This project is in early development. Contributions and feedback are welcome.

## License

MIT