# Methodology and Results Notes

**Student:** ZIYAD ABDULLAH ALJOHANI  
**Program:** SDAIA Academy  
**Course:** Time Series Forecasting for AI Systems  
**Program dates:** 20–22 September 2026  
**Submission date:** 21 September 2026

## 1. Series used

The analysis uses the **Riyadh / Grocery** series from the course dataset. After sorting by date and enforcing daily frequency, the series contains **1,096 observations** from 2023-01-01 to 2025-12-31 with no missing days.

This series was selected because it combines enough daily history for repeated time-based validation, a clear weekly seasonal structure for classical methods, and irregular spikes that make the comparison with machine-learning models useful.

## 2. Structure and stationarity

STL is fitted with a 7-day period. The decomposition shows a rising trend, strong weekly seasonality, and several large residual spikes.

The raw ADF p-value is **0.0022504**. After first differencing it is **4.58357e-17**. The raw test rejects a unit root, but the trend and autocorrelation pattern still support including first differencing among the SARIMAX candidates.

## 3. SARIMAX selection

The candidate grid compares short non-seasonal AR/MA orders with weekly seasonal terms. Non-converged fits are excluded before model selection.

The best converged candidate is:

`SARIMAX(1,1,2) × (1,1,1,7)`

Selection statistics:

- AIC: **12259.87**
- BIC: **12289.42**
- Converged: **Yes**

On the recent 60-day evaluation window:

- MAE: **68.43**
- RMSE: **83.57**
- WAPE: **11.59%**
- MASE: **0.755**

Ljung-Box results:

- lag 7: p = **0.1547**
- lag 14: p = **0.0048**
- lag 21: p = **0.0180**

The weekly lag itself is not significant, but longer-lag residual dependence remains.

## 4. Holt-Winters and baseline

Holt-Winters uses additive trend and additive weekly seasonality. Seasonal naive repeats the previous week's observations.

On the recent 60-day evaluation window:

- Holt-Winters WAPE: **17.10%**
- Seasonal naive WAPE: **13.23%**

The recent-window result alone is not used to choose the benchmark because it differs from the repeated walk-forward result.

## 5. LightGBM

Features include lags 1, 7, 14, and 28, shifted rolling statistics, and calendar features. Friday and Saturday are treated as the weekend.

All lag and rolling features use past values only. Multi-step prediction is recursive.

Final 60-day result:

- MAE: **45.59**
- RMSE: **53.87**
- WAPE: **7.72%**
- MASE: **0.503**

## 6. Walk-forward backtesting

The main point-model comparison uses five folds with a 14-day forecast horizon. The expanding window is the primary design because there is no documented single regime break that makes older history clearly obsolete. A fixed 730-day rolling window is included as a sensitivity check for the possibility that older observations are less useful.

Expanding-window mean WAPE:

- Holt-Winters: **5.97%**
- LightGBM: **6.30%**
- Seasonal naive: **7.88%**

Rolling-window mean WAPE with a 730-day training window:

- Holt-Winters: **6.15%**
- Seasonal naive: **7.88%**

Models are refitted for every fold. Future test values are not used to construct training features.

## 7. Metrics

The project reports MAE, RMSE, WAPE, MASE, pinball loss, coverage, and interval width. The selected series has no zero or near-zero demand values (minimum 397 units), so WAPE is stable for a percentage-style summary. MASE is also reported because it scales the forecast error against a weekly seasonal-naive benchmark.

## 8. Prediction intervals

Final 60-day interval results:

- Prophet: WAPE **5.1%**, coverage **100%**, width **341.2**
- Quantile LightGBM: WAPE **7.04%**, coverage **78.3%**, width **227.10**
- sktime Theta: WAPE **12.2%**, coverage **100%**, width **1005.9**
- Split conformal: WAPE **8.19%**, coverage **78.3%**, width **139.99**

The nominal target is 80%. Coverage and width are considered together.

## 9. Final interpretation

Holt-Winters is the point-forecast benchmark for this series because it gives the best average error in the repeated expanding-window test, remains close in the rolling-window sensitivity check, is straightforward to interpret, and is inexpensive to refit.

The recommendation follows the course decision axes: **history length, interpretability, interval support, and compute cost**. The 1,096 daily observations provide enough history for weekly seasonal methods and lag-based machine-learning features. Prophet and sktime provide interval APIs, although their intervals are wider in this run. LightGBM is retained as the flexible alternative when promotions, prices, holidays, weather, or other future-known predictors become available.

The final 60-day window is an additional recent-period evaluation rather than an independent model-selection holdout, because the walk-forward evaluation also reaches the end of the series.

## 10. Reproducibility and limitations

Random seed: **20260912**.

The repository includes the dataset, shared metric/backtest utilities, and package requirements. The dataset is synthetic. Promotions and holiday effects are not supplied as future-known variables. Recursive forecasts can accumulate error, SARIMAX retains some longer-lag residual structure, and interval calibration may change under a different demand regime.

SDAIA Academy: https://github.com/SDAIAAcademy
