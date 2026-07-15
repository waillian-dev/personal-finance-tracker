const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

// @desc    Forecast expenses for the next 30 days based on historic patterns
// @route   GET /api/predictions/expenses
// @access  Private
const getExpenseForecast = async (req, res) => {
  try {
    const userId = req.user.id;

    // Look back at the last 90 days of transaction history
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: ninetyDaysAgo },
      type: 'expense',
    }).populate('categoryId');

    if (transactions.length === 0) {
      return res.json({
        success: true,
        data: {
          forecastedTotal: 0,
          averageDailySpend: 0,
          confidenceScore: 30, // low confidence due to no data
          categoryForecasts: [],
          insight: 'Not enough transaction history to make an accurate forecast. Try logging a few transactions first!',
        },
      });
    }

    // Find the actual date span of the logged transactions
    const dates = transactions.map((t) => new Date(t.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const dayDiff = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
    const actualDays = Math.min(90, Math.max(7, dayDiff)); // standardise base days to at least 7, up to 90

    // Sum overall expenses and categories
    let totalExpense = 0;
    const categoryTotals = {};

    transactions.forEach((tx) => {
      totalExpense += tx.amount;
      if (tx.categoryId) {
        const catId = tx.categoryId._id.toString();
        if (!categoryTotals[catId]) {
          categoryTotals[catId] = {
            name: tx.categoryId.name,
            emoji: tx.categoryId.emoji,
            color: tx.categoryId.color,
            total: 0,
          };
        }
        categoryTotals[catId].total += tx.amount;
      }
    });

    const averageDailySpend = parseFloat((totalExpense / actualDays).toFixed(2));
    const forecastedTotal = parseFloat((averageDailySpend * 30).toFixed(2));

    // Forecast per category
    const categoryForecasts = Object.keys(categoryTotals).map((catId) => {
      const cat = categoryTotals[catId];
      const dailyCatSpend = cat.total / actualDays;
      return {
        categoryId: catId,
        name: cat.name,
        emoji: cat.emoji,
        color: cat.color,
        historical90DayTotal: parseFloat(cat.total.toFixed(2)),
        projected30DayTotal: parseFloat((dailyCatSpend * 30).toFixed(2)),
      };
    });

    // Confidence score heuristic based on data availability
    // More transactions + more days = higher confidence
    const txCountFactor = Math.min(40, transactions.length * 2); // max 40 points for count
    const daysFactor = Math.min(40, actualDays * 0.8); // max 40 points for timespan
    const confidenceScore = Math.min(95, Math.round(20 + txCountFactor + daysFactor)); // base 20, max 95%

    // Formulate a helpful prediction insight
    let insight = `Based on your last ${actualDays} days of spending, we project you will spend ${forecastedTotal} in the next 30 days.`;
    if (forecastedTotal > (req.user.monthlySalary || 0) && (req.user.monthlySalary || 0) > 0) {
      insight += ` WARNING: This exceeds your monthly baseline salary of ${req.user.monthlySalary}. Consider reducing discretionary spending.`;
    } else {
      insight += ` This is within your monthly income boundaries. Keep it up!`;
    }

    res.json({
      success: true,
      data: {
        forecastedTotal,
        averageDailySpend,
        confidenceScore,
        categoryForecasts,
        insight,
      },
    });
  } catch (error) {
    console.error('Expense forecast prediction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Suggest budget adjustments based on discretionary income trends
// @route   GET /api/predictions/budgets
// @access  Private
const getBudgetSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const monthlySalary = req.user.monthlySalary || 0;

    // Get the last 60 days of transaction history to determine monthly averages
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: sixtyDaysAgo },
    }).populate('categoryId');

    // Calculate actual monthly averages
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryExpenseMap = {};

    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
        if (tx.categoryId) {
          const catId = tx.categoryId._id.toString();
          if (!categoryExpenseMap[catId]) {
            categoryExpenseMap[catId] = {
              categoryId: catId,
              name: tx.categoryId.name,
              type: tx.categoryId.type,
              emoji: tx.categoryId.emoji,
              color: tx.categoryId.color,
              totalAmount: 0,
            };
          }
          categoryExpenseMap[catId].totalAmount += tx.amount;
        }
      }
    });

    // Use monthlySalary from profile as a fallback/baseline for income
    const monthlyIncomeEstimate = Math.max(monthlySalary, totalIncome / 2);
    const monthlyExpenseEstimate = totalExpense / 2;
    const discretionaryIncome = monthlyIncomeEstimate - monthlyExpenseEstimate;

    const suggestions = [];

    if (transactions.length === 0 || monthlyExpenseEstimate === 0) {
      // Return default starter suggestions if there is no data
      const defaultCategories = await Category.find({ userId: null, type: 'expense' });
      const starterSuggestions = defaultCategories.slice(0, 3).map((cat) => ({
        categoryId: cat._id.toString(),
        categoryName: cat.name,
        emoji: cat.emoji,
        color: cat.color,
        currentSpendEstimate: 0,
        suggestedBudget: 150,
        reason: `Initial placeholder budget suggestion for ${cat.name} to help start tracking.`,
        savingsPotential: 0,
      }));

      return res.json({
        success: true,
        data: {
          monthlyIncomeEstimate,
          monthlyExpenseEstimate: 0,
          discretionaryIncome: monthlyIncomeEstimate,
          suggestions: starterSuggestions,
          generalRecommendation: 'Log more transactions so the AI engine can analyze your discretionary spending and recommend optimizations.',
        },
      });
    }

    // Categories where we can reduce spending (mostly discretionary categories)
    const discretionaryCategoryKeywords = [
      'food', 'dining', 'shopping', 'entertainment', 'travel', 'leisure', 'subscription', 'gifts'
    ];

    Object.keys(categoryExpenseMap).forEach((catId) => {
      const cat = categoryExpenseMap[catId];
      const monthlyCatSpend = cat.totalAmount / 2; // divide by 2 since we queried 60 days
      let suggestedBudget = monthlyCatSpend;
      let reason = '';
      let savingsPotential = 0;

      const isDiscretionary = discretionaryCategoryKeywords.some((k) =>
        cat.name.toLowerCase().includes(k)
      );

      if (discretionaryIncome < 0) {
        // Tight budget/overspending: Recommend 20% reduction on discretionary items
        if (isDiscretionary) {
          suggestedBudget = Math.round(monthlyCatSpend * 0.8);
          savingsPotential = Math.round(monthlyCatSpend * 0.2);
          reason = `You are running a budget deficit. Reduce discretionary spending on ${cat.name} by 20% to balance cash flow.`;
        } else {
          // Fixed items: Recommend 5% buffer reduction
          suggestedBudget = Math.round(monthlyCatSpend * 0.95);
          savingsPotential = Math.round(monthlyCatSpend * 0.05);
          reason = `Tight cash flow detected. Trim utility/bill waste on ${cat.name} by 5%.`;
        }
      } else {
        // Healthy income: Recommend 10% optimisation to boost savings rate
        if (isDiscretionary) {
          suggestedBudget = Math.round(monthlyCatSpend * 0.9);
          savingsPotential = Math.round(monthlyCatSpend * 0.1);
          reason = `Optimize spending on ${cat.name} by 10% to redirect funds into your high-yield savings goals.`;
        } else {
          // Standard recommendation
          suggestedBudget = Math.round(monthlyCatSpend * 1.05); // allow 5% breathing room
          reason = `Maintain current spending baseline for ${cat.name} with a small safety buffer.`;
        }
      }

      // Only suggest budgets for categories with meaningful spending (> $10 per month)
      if (monthlyCatSpend > 10) {
        suggestions.push({
          categoryId: catId,
          categoryName: cat.name,
          emoji: cat.emoji,
          color: cat.color,
          currentSpendEstimate: parseFloat(monthlyCatSpend.toFixed(2)),
          suggestedBudget: Math.max(10, suggestedBudget),
          reason,
          savingsPotential: parseFloat(savingsPotential.toFixed(2)),
        });
      }
    });

    // General overall recommendation text
    let generalRecommendation = '';
    const totalPotentialSavings = suggestions.reduce((sum, s) => sum + s.savingsPotential, 0);

    if (discretionaryIncome < 0) {
      generalRecommendation = `Alert: Monthly expenses exceed income by ${Math.abs(discretionaryIncome).toFixed(2)}. Implementing these suggested adjustments can save you up to ${totalPotentialSavings.toFixed(2)} monthly and restore financial balance.`;
    } else {
      const currentSavingsRate = (discretionaryIncome / monthlyIncomeEstimate) * 100;
      generalRecommendation = `Great job! Your current savings rate is ${currentSavingsRate.toFixed(1)}%. Implementing these recommendations could increase monthly savings by ${totalPotentialSavings.toFixed(2)}.`;
    }

    res.json({
      success: true,
      data: {
        monthlyIncomeEstimate: parseFloat(monthlyIncomeEstimate.toFixed(2)),
        monthlyExpenseEstimate: parseFloat(monthlyExpenseEstimate.toFixed(2)),
        discretionaryIncome: parseFloat(discretionaryIncome.toFixed(2)),
        suggestions: suggestions.sort((a, b) => b.savingsPotential - a.savingsPotential),
        generalRecommendation,
      },
    });
  } catch (error) {
    console.error('Budget suggestions prediction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getExpenseForecast,
  getBudgetSuggestions,
};
