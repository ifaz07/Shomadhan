const { expandText } = require('../services/aiContentService');

/**
 * @desc    Expand short text into detailed content
 * @route   POST /api/v1/ai/expand
 * @access  Private
 */
exports.handleTextExpansion = async (req, res, next) => {
  try {
    const { text, context } = req.body;

    if (!text || text.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least a few words to expand."
      });
    }

    const expanded = await expandText(text, context);

    res.status(200).json({
      success: true,
      data: expanded
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "AI Expansion failed"
    });
  }
};
