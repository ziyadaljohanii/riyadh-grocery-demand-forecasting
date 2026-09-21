# Riyadh Grocery Demand Forecasting

**Student:** ZIYAD ABDULLAH ALJOHANI  
**Programme:** Time Series Forecasting for AI Systems — SDAIA Academy  
**Cohort dates:** 20–22 September 2026  
**Submission date:** 21 September 2026

This project forecasts daily grocery demand for the **Riyadh / Grocery** series in the synthetic dataset provided with the course. The series contains **1,096 daily observations** from 1 January 2023 to 31 December 2025.

The complete analysis is in:

`Ziyad_Riyadh_Grocery_Forecasting_Capstone.ipynb`

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/ziyadaljohanii/riyadh-grocery-demand-forecasting/blob/main/Ziyad_Riyadh_Grocery_Forecasting_Capstone.ipynb)

## Objective

The goal is to compare several forecasting approaches under a time-aware evaluation rather than selecting a model from one random split. The analysis covers time-series structure and stationarity, classical forecasting with SARIMAX and Holt-Winters, LightGBM with lag/rolling/calendar features, walk-forward validation, point-forecast metrics, and prediction intervals.

## Data and evaluation

The selected series is **Riyadh / Grocery** at daily frequency with no missing dates. I chose it because the three years of daily history support repeated walk-forward evaluation, the weekly seasonal pattern is clear enough for classical forecasting, and the irregular spikes make the comparison with machine-learning approaches meaningful.

For point-model validation, the project uses five walk-forward folds with a 14-day horizon. The expanding window is the main comparison because there is no documented regime break that makes older observations clearly obsolete; a 730-day rolling window is used as a sensitivity check.

The final 60-day window is reported as an additional recent-period evaluation. It is not treated as an independent model-selection holdout because the walk-forward evaluation also reaches the end of the series.

## Main results

### Repeated expanding-window backtest

| Model | Mean WAPE |
|---|---:|
| Holt-Winters | **5.97%** |
| LightGBM | **6.30%** |
| Seasonal naive | **7.88%** |

With a fixed 730-day rolling window, Holt-Winters gives **6.15%** mean WAPE.

### Final 60-day checks

- SARIMAX: **11.59% WAPE**
- LightGBM: **7.72% WAPE**
- Prophet: **5.1% WAPE**
- sktime Theta: **12.2% WAPE**

Prophet and sktime are shown as recent-period checks; they are not part of the same five-fold point-model backtest.

### Forecast intervals

- Prophet: **100% coverage**, mean width **341.2**
- Quantile LightGBM: **78.3% coverage**, mean width **227.10**
- sktime Theta: **100% coverage**, mean width **1005.9**
- Split conformal: **78.3% coverage**, mean width **139.99**

The nominal interval level is 80%. Coverage is interpreted together with interval width.

## Model choice

Holt-Winters is kept as the main point-forecast benchmark because it gives the lowest average WAPE across the repeated expanding folds, remains close under the rolling-window check, is easy to interpret, and is inexpensive to refit.

The recommendation also considers the course decision axes: **history length, interpretability, interval support, and compute budget**. With 1,096 daily observations, the series has enough history for weekly seasonal methods and lag-based ML features. Prophet and sktime provide interval APIs but produce wider intervals in this run. LightGBM is the main alternative when useful external predictors become available.

The recent 60-day Prophet result is reported as an additional comparison, not as an independent model-selection verdict.

## Run

### Google Colab

Open the notebook directly in Colab:

https://colab.research.google.com/github/ziyadaljohanii/riyadh-grocery-demand-forecasting/blob/main/Ziyad_Riyadh_Grocery_Forecasting_Capstone.ipynb

Then choose **Runtime → Run all**. The notebook installs or verifies the required forecasting packages before the analysis starts.

### Local Python

Clone the repository, install the dependencies, and launch Jupyter:

```bash
git clone https://github.com/ziyadaljohanii/riyadh-grocery-demand-forecasting.git
cd riyadh-grocery-demand-forecasting
python -m pip install -r requirements.txt
jupyter notebook Ziyad_Riyadh_Grocery_Forecasting_Capstone.ipynb
```

Run the notebook cells from top to bottom.

Minor last-decimal differences can appear in optimized Holt-Winters results across Python/SciPy/statsmodels environments. The saved notebook outputs were produced in Python 3.11; these small numerical differences do not change the model ranking or conclusions.

## Repository contents

```text
.
├── Ziyad_Riyadh_Grocery_Forecasting_Capstone.ipynb
├── README.md
├── TECHNICAL_DOCUMENTATION.md
├── requirements.txt
├── .gitignore
├── data/
│   └── retail_demand.csv
└── common/
    ├── metrics.py
    └── backtest.py
```

## References

- SDAIA Academy: https://github.com/SDAIAAcademy
- Course repository: https://github.com/MohammadYusif/time-series-forecasting-ai-systems
- Course website: https://mohammadyusif.github.io/time-series-forecasting-ai-systems/

## Scope

The dataset is synthetic. The results demonstrate forecasting methodology and model evaluation; they should not be interpreted as measured demand from a real retailer.
