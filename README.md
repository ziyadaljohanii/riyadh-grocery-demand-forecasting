# Riyadh Grocery Demand Forecasting

**Student:** ZIYAD ABDULLAH ALJOHANI  
**Program:** SDAIA Academy  
**Course:** Time Series Forecasting for AI Systems  
**Program dates:** 20–22 September 2026  
**Submission date:** 21 September 2026

This project forecasts daily grocery demand for the **Riyadh / Grocery** series in the synthetic dataset provided with the course. The series contains **1,096 daily observations** from 1 January 2023 to 31 December 2025.

The complete analysis is in:

`Ziyad_Riyadh_Grocery_Forecasting_Capstone.ipynb`

## Objective

The goal is to compare several forecasting approaches under a time-aware evaluation rather than selecting a model from one random split. The analysis covers time-series structure and stationarity, classical forecasting with SARIMAX and Holt-Winters, LightGBM with lag/rolling/calendar features, walk-forward validation, point-forecast metrics, and prediction intervals.

## Data and evaluation

The selected series is **Riyadh / Grocery** at daily frequency with no missing dates.

For point-model validation, the project uses five walk-forward folds with a 14-day horizon. A final 60-day holdout is kept as a separate check.

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

Prophet and sktime are shown as final-holdout checks; they are not part of the same five-fold point-model backtest.

### Forecast intervals

- Prophet: **100% coverage**, mean width **341.2**
- Quantile LightGBM: **78.3% coverage**, mean width **227.10**
- sktime Theta: **100% coverage**, mean width **1005.9**
- Split conformal: **78.3% coverage**, mean width **139.99**

The nominal interval level is 80%. Coverage is interpreted together with interval width.

## Model choice

Holt-Winters is kept as the main point-forecast benchmark because it gives the lowest average WAPE across the repeated expanding folds and remains close under the rolling-window check.

LightGBM is the main alternative when additional predictors are available. Prophet gives the lowest WAPE on the final 60-day holdout, but that result is not directly equivalent to the repeated point-model backtest.

## Run

### Google Colab

Open the notebook directly in Colab:

https://colab.research.google.com/github/ziyadaljohanii/riyadh-grocery-demand-forecasting/blob/main/Ziyad_Riyadh_Grocery_Forecasting_Capstone.ipynb

Then choose **Runtime → Run all**. The notebook checks for the optional forecasting libraries it needs and installs missing ones before the analysis starts.

### Local Python

Clone the repository, install the dependencies, and launch Jupyter:

```bash
git clone https://github.com/ziyadaljohanii/riyadh-grocery-demand-forecasting.git
cd riyadh-grocery-demand-forecasting
python -m pip install -r requirements.txt
jupyter notebook Ziyad_Riyadh_Grocery_Forecasting_Capstone.ipynb
```

Run the notebook cells from top to bottom.

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
