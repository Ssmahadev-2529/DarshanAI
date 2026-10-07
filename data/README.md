# DARSHANAI Temple Crowd Dataset Documentation

## Overview
The **DarshanAI Temple Crowd Dataset** contains multi-temple operational observations (up to 52,000 synthetic records covering 365 full simulated days across multiple temples including Somnath, Tirupati Balaji, and Madurai Meenakshi). The dataset captures diurnal traffic curves, auspicious festival rushes (Navratri, Diwali, Shivaratri), weather dynamics (monsoon rainfall), staff allocations, queue dynamics, waiting times, and safety incident classifications.

---

## Dataset Schema & Feature Definitions

| Column Name | Type | Unit / Format | Description |
|---|---|---|---|
| `timestamp` | String | ISO 8601 (`YYYY-MM-DD HH:MM:SS`) | Timestamp of operational measurement |
| `temple_id` | String | Identifier | Multi-tenant temple code (`TEMPLE-001`, `TEMPLE-002`, `TEMPLE-003`) |
| `day_of_week` | Integer | `0` (Mon) – `6` (Sun) | Day of the week |
| `month` | Integer | `1` – `12` | Calendar month |
| `festival` | Integer | `0` or `1` | Binary flag for major religious pilgrimage festival |
| `holiday` | Integer | `0` or `1` | Binary flag for public or regional holiday |
| `weather` | String | Categorical | Weather condition (`Clear`, `Sunny`, `Cloudy`, `Rainy`, `Heavy Rain`) |
| `temperature` | Float | °C | Ambient temperature |
| `rainfall` | Float | mm | Precipitation level |
| `entry_count` | Integer | Devotees / hr | Pilgrims passing through entry gates |
| `exit_count` | Integer | Devotees / hr | Pilgrims exiting through designated exits |
| `current_crowd` | Integer | Devotees | **Target 1 (Regression):** Total devotees present on temple premises |
| `queue_length` | Integer | Devotees | Total devotees waiting across all holding queues |
| `active_counters` | Integer | Count | Operational darshan verification counters |
| `average_service_time` | Float | Minutes | Time spent by each devotee at the sanctum sanctorum |
| `darshan_type` | String | Categorical | Primary lane type (`General Darshan`, `Special Darshan`, `VIP`, `Senior Citizen`, `Divyang`, `Children / Family`) |
| `staff_count` | Integer | Staff count | Active temple management staff on duty |
| `security_count` | Integer | Personnel count | Deployed security officers and police personnel |
| `zone_id` | String | Identifier | Monitored temple zone (`main_entrance`, `queue_area`, `darshan_hall`, `prasadam_area`, `exit_gates`, `parking_lot`) |
| `zone_capacity` | Integer | Devotees | Zone maximum safe capacity |
| `waiting_time` | Float | Minutes | **Target 4 (Regression):** Estimated queue waiting time |
| `crowd_density` | String | Categorical | **Target 2 (Classification):** `LOW`, `MODERATE`, `HIGH`, `CRITICAL` |
| `risk_level` | String | Categorical | **Target 3 (Classification):** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |

---

## Synthetic Data Generation Methodology (`ml/generate_dataset.py`)

The dataset is synthesized using realistic mathematical modeling of pilgrimage crowd behaviors:
1. **Diurnal Influx Curves:** Two distinct peak distribution bells matching Indian temple rituals:
   - *Morning Peak:* 07:00 to 11:00 (Suprabhatam & Morning Darshan)
   - *Evening Peak:* 16:00 to 20:30 (Sandhya Aarti & Night Darshan)
2. **Surge Multipliers:**
   - Festivals (Navratri, Diwali, Shivaratri): **2.2x base influx multiplier**
   - Public holidays: **1.6x multiplier**
   - Weekends (Saturdays & Sundays): **1.35x multiplier**
3. **Queue Wait-Time Mechanics:** Modeled with $M/M/c$ queuing theory approximations based on active verification counters, sanctum service times, and upstream queue lengths.
4. **Safety Risk & Density Thresholds:**
   - `LOW`: Capacity utilization $< 45\%$
   - `MODERATE`: Capacity utilization $45\% - 70\%$
   - `HIGH`: Capacity utilization $70\% - 90\%$
   - `CRITICAL`: Capacity utilization $> 90\%$ or severe bottlenecking detected

---

## Machine Learning Model Targets

The generated dataset directly trains the 5-model ML ensemble:
- **Crowd Regressor:** Predicts `current_crowd` ($R^2 = 0.9891$)
- **Crowd Classifier:** Predicts `crowd_density` tier (Accuracy = $97.55\%$)
- **Risk Classifier:** Predicts `risk_level` stampede safety index (Accuracy = $98.00\%$)
- **Wait Time Model:** Predicts `waiting_time` in minutes ($R^2 = 0.9865$)
- **Anomaly Detector:** Unsupervised `IsolationForest` trained on anomalous surges (contamination $= 0.03$)

---

## Regenerating the Dataset

To re-synthesize and update the dataset:
```bash
python ml/generate_dataset.py
```
This produces `data/crowd_dataset.csv` ready for model re-training via:
```bash
python -m ml.train_models
```
