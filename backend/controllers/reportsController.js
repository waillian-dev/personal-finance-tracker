const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const Category = require('../models/Category');

// @desc    Get top level dashboard report (Net Worth, cash flow, top spending, health score)
// @route   GET /api/reports/dashboard
// @access  Private
const getDashboardReport = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Calculate Net Worth (Sum of all wallet balances)
    const wallets = await Wallet.find({ userId });
    const netWorth = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);

    // 2. Calculate current month's cash flow (Income vs Expense)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyTransactions = await Transaction.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).populate('categoryId');

    let monthlyIncome = 0;
    let monthlyExpense = 0;
    const categorySpendingMap = {};

    monthlyTransactions.forEach((tx) => {
      if (tx.type === 'income') {
        monthlyIncome += tx.amount;
      } else if (tx.type === 'expense') {
        monthlyExpense += tx.amount;
        if (tx.categoryId) {
          const catId = tx.categoryId._id ? tx.categoryId._id.toString() : tx.categoryId.toString();
          if (!categorySpendingMap[catId]) {
            categorySpendingMap[catId] = {
              categoryId: catId,
              name: tx.categoryId.name || 'Uncategorized',
              color: tx.categoryId.color || '#64748B',
              emoji: tx.categoryId.emoji || '📁',
              amount: 0,
            };
          }
          categorySpendingMap[catId].amount += tx.amount;
        }
      }
    });

    // 3. Savings Rate
    const savings = monthlyIncome - monthlyExpense;
    const savingsRate = monthlyIncome > 0 ? parseFloat(((savings / monthlyIncome) * 100).toFixed(2)) : 0;

    // 4. Calculate Financial Health Score (30 - 100)
    let healthScore = 70; // Base score

    // Net worth modifier
    if (netWorth > 10000) healthScore += 15;
    else if (netWorth > 2000) healthScore += 10;
    else if (netWorth > 0) healthScore += 5;
    else if (netWorth < 0) healthScore -= 10; // Debt exceeds assets

    // Savings rate modifier
    if (savingsRate > 30) healthScore += 15;
    else if (savingsRate > 15) healthScore += 10;
    else if (savingsRate > 0) healthScore += 5;
    else if (savingsRate < 0) healthScore -= 15; // Overspending

    // Cap health score between 30 and 100
    healthScore = Math.max(30, Math.min(100, healthScore));

    // 5. Format Top Spending Categories
    const topCategories = Object.values(categorySpendingMap)
      .sort((a, b) => b.amount - a.amount)
      .map((cat) => ({
        ...cat,
        percentage: monthlyExpense > 0 ? parseFloat(((cat.amount / monthlyExpense) * 100).toFixed(2)) : 0,
      }));

    res.json({
      success: true,
      data: {
        netWorth,
        monthlyIncome,
        monthlyExpense,
        savings,
        savingsRate,
        financialHealthScore: healthScore,
        topCategories,
      },
    });
  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get detailed breakdown for a specific month
// @route   GET /api/reports/monthly
// @access  Private
const getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    const targetMonth = month !== undefined ? parseInt(month, 10) - 1 : new Date().getMonth(); // 0-indexed in JS

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).populate('categoryId walletId');

    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfer = 0;

    const dailyBreakdown = {};
    const categoryBreakdown = {};
    const walletBreakdown = {};

    // Initialize daily breakdown map
    const daysInMonth = endOfMonth.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      dailyBreakdown[d] = { income: 0, expense: 0 };
    }

    transactions.forEach((tx) => {
      const day = new Date(tx.date).getDate();
      const amount = tx.amount;

      if (tx.type === 'income') {
        totalIncome += amount;
        if (dailyBreakdown[day]) dailyBreakdown[day].income += amount;
      } else if (tx.type === 'expense') {
        totalExpense += amount;
        if (dailyBreakdown[day]) dailyBreakdown[day].expense += amount;

        if (tx.categoryId) {
          const catId = tx.categoryId._id ? tx.categoryId._id.toString() : tx.categoryId.toString();
          if (!categoryBreakdown[catId]) {
            categoryBreakdown[catId] = {
              categoryId: catId,
              name: tx.categoryId.name || 'Uncategorized',
              color: tx.categoryId.color || '#64748B',
              emoji: tx.categoryId.emoji || '📁',
              amount: 0,
            };
          }
          categoryBreakdown[catId].amount += amount;
        }
      } else if (tx.type === 'transfer') {
        totalTransfer += amount;
      }

      // Wallet breakdown (sum of active balances/transactions)
      if (tx.walletId) {
        const walletId = tx.walletId._id ? tx.walletId._id.toString() : tx.walletId.toString();
        if (!walletBreakdown[walletId]) {
          walletBreakdown[walletId] = {
            walletId,
            name: tx.walletId.name || 'Unknown Wallet',
            type: tx.walletId.type || 'other',
            color: tx.walletId.color || '#10B981',
            income: 0,
            expense: 0,
          };
        }
        if (tx.type === 'income') walletBreakdown[walletId].income += amount;
        if (tx.type === 'expense') walletBreakdown[walletId].expense += amount;
      }
    });

    const formattedDaily = Object.keys(dailyBreakdown).map((day) => ({
      day: parseInt(day, 10),
      income: dailyBreakdown[day].income,
      expense: dailyBreakdown[day].expense,
    }));

    const formattedCategories = Object.values(categoryBreakdown).map((cat) => ({
      ...cat,
      percentage: totalExpense > 0 ? parseFloat(((cat.amount / totalExpense) * 100).toFixed(2)) : 0,
    }));

    res.json({
      success: true,
      data: {
        period: {
          month: targetMonth + 1,
          year: targetYear,
        },
        totals: {
          income: totalIncome,
          expense: totalExpense,
          transfers: totalTransfer,
          netSavings: totalIncome - totalExpense,
        },
        dailyBreakdown: formattedDaily,
        categoryBreakdown: formattedCategories,
        walletBreakdown: Object.values(walletBreakdown),
      },
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get aggregated yearly report (grouped by month)
// @route   GET /api/reports/yearly
// @access  Private
const getYearlyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year } = req.query;

    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: startOfYear, $lte: endOfYear },
    });

    // Initialize 12 months array
    const monthlySummary = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(targetYear, i, 1).toLocaleString('default', { month: 'long' }),
      income: 0,
      expense: 0,
      netSavings: 0,
    }));

    transactions.forEach((tx) => {
      const monthIndex = new Date(tx.date).getMonth();
      if (tx.type === 'income') {
        monthlySummary[monthIndex].income += tx.amount;
      } else if (tx.type === 'expense') {
        monthlySummary[monthIndex].expense += tx.amount;
      }
    });

    monthlySummary.forEach((m) => {
      m.netSavings = m.income - m.expense;
    });

    const yearlyTotals = monthlySummary.reduce(
      (totals, m) => {
        totals.income += m.income;
        totals.expense += m.expense;
        totals.netSavings += m.netSavings;
        return totals;
      },
      { income: 0, expense: 0, netSavings: 0 }
    );

    res.json({
      success: true,
      data: {
        year: targetYear,
        totals: yearlyTotals,
        monthlyBreakdown: monthlySummary,
      },
    });
  } catch (error) {
    console.error('Yearly report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getDashboardReport,
  getMonthlyReport,
  getYearlyReport,
};
