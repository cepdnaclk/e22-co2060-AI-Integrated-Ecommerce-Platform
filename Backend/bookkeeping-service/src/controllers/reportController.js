import { getBalanceSheet, getProfitAndLoss, getTrialBalance } from "../services/reportingService.js";

export const getProfitLossReport = async (_req, res, next) => {
  try {
    const report = await getProfitAndLoss();
    res.json(report);
  } catch (error) {
    next(error);
  }
};

export const getBalanceSheetReport = async (_req, res, next) => {
  try {
    const report = await getBalanceSheet();
    res.json(report);
  } catch (error) {
    next(error);
  }
};

export const getTrialBalanceReport = async (_req, res, next) => {
  try {
    const report = await getTrialBalance();
    res.json(report);
  } catch (error) {
    next(error);
  }
};

