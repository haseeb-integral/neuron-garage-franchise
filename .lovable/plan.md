
## Neuron Garage Franchise Acquisition System

A multi-page web app with sidebar navigation and placeholder pages.

### Structure
- **Layout**: Fixed left sidebar (dark blue #003c7e) + main content area (#f2f4f6 background)
- **Sidebar**: "Neuron Garage" logo text at top, 5 nav items with icons, active state styling
- **Pages**: Dashboard, City Scoring, Teacher Prospects, Candidate Pipeline, Onboarding

### Design System
- Sidebar: #003c7e bg, #004ea4 active bg, #4ba0ff active text, white 75% opacity inactive text
- Content: #f2f4f6 bg, white cards with #dee2e6 border, 8px rounded corners
- Typography: Inter font, #343a40 body text
- Accent: #fd7e14 orange for primary buttons and icon accents

### Dashboard Page
- 4 stat cards (Total Cities Scored, Total Prospects Found, Candidates in Pipeline, Active Onboardings) — all showing 0, with orange-accented icons
- Welcome message below the stats

### Other Pages (City Scoring, Teacher Prospects, Candidate Pipeline, Onboarding)
- Placeholder card with page title, short description, and "Coming Soon" badge

### Routing
- `/` → Dashboard
- `/city-scoring` → City Scoring
- `/teacher-prospects` → Teacher Prospects
- `/candidate-pipeline` → Candidate Pipeline
- `/onboarding` → Onboarding
