/**
 * @file resumeController.js
 * @description Controllers for resume analysis, skill gap comparison, interview prep,
 * history retrieval, and detailed record loading.
 */

const fs = require('fs');
const firebaseService = require('../services/firebaseService');
const resumeService = require('../services/resumeService');
const logger = require('../utils/logger');

/**
 * @route POST /api/analyze (and /api/upload)
 * @desc Complete resume analysis: extract text, score, run AI analysis, save to database, and return results.
 * @access Private
 */
exports.analyzeResume = async (req, res, next) => {
  const startTime = Date.now();
  logger.info('Pipeline', '🚀 Starting resume analysis pipeline...');
  
  let filePathToDelete = null;

  try {
    // 1. File Validation
    if (!req.file) {
      logger.error('Pipeline', 'Validation Error: No file uploaded.');
      const error = new Error('No file uploaded. Please select a PDF resume file.');
      error.statusCode = 400;
      error.code = 'MISSING_FILE';
      return next(error);
    }

    const { path: filePath, originalname } = req.file;
    filePathToDelete = filePath;
    const userId = req.user ? req.user.uid : 'anonymous';
    if (userId === 'anonymous' && process.env.NODE_ENV !== 'development') {
      const error = new Error('Access denied. Authentication required.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }
    logger.info('Pipeline', `📄 [STAGE 1: Receipt] File received: "${originalname}" for User ID: ${userId}`);

    const { targetRole } = req.body;

    const { analysisId, record } = await resumeService.processResumeAnalysis(userId, req.file, targetRole);

    const duration = Date.now() - startTime;
    logger.info('Pipeline', `⏱️ Resume analysis completed in ${duration}ms.`);

    return res.status(200).json({
      success: true,
      analysisId: analysisId,
      userId: userId,
      resumeName: originalname,
      targetRole: targetRole,
      score: record.score,
      breakdown: record.breakdown,
      explanations: record.explanations,
      strengths: record.strengths,
      weaknesses: record.weaknesses,
      recommendations: record.recommendations,
      atsTips: record.atsTips,
      rewriteSuggestions: record.rewriteSuggestions,
      missingKeywords: record.missingKeywords,
      missingSections: record.missingSections,
      recruiterFeedback: record.recruiterFeedback,
      skillGap: record.skillGap,
      interviewPrep: record.interviewPrep,
      createdAt: record.createdAt
    });

  } catch (error) {
    logger.error('Pipeline', `Unexpected Pipeline Error: ${error.message}`);
    next(error);
  } finally {
    if (filePathToDelete && fs.existsSync(filePathToDelete)) {
      fs.unlink(filePathToDelete, (err) => {
        if (err) {
          logger.error('Pipeline', `Failed to clean up uploaded file: ${filePathToDelete}`, { error: err.message });
        } else {
          logger.info('Pipeline', `🧹 Successfully cleaned up uploaded file from disk: ${filePathToDelete}`);
        }
      });
    }
  }
};

/**
 * @route GET /api/history
 * @desc Get upload and analysis history for the logged-in user.
 * @access Private
 */
exports.getAnalysisHistory = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.uid : 'anonymous';
    if (userId === 'anonymous' && process.env.NODE_ENV !== 'development') {
      const error = new Error('Access denied. Authentication required.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }
    logger.info('History', `📂 Retrieving analysis history for User ID: ${userId}`);
    
    const history = await firebaseService.getUserHistory(userId);
    
    return res.status(200).json({
      success: true,
      history: history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/dashboard/stats
 * @desc Get aggregated dashboard statistics and recent analysis summaries.
 * @access Private
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.uid : 'anonymous';
    if (userId === 'anonymous' && process.env.NODE_ENV !== 'development') {
      const error = new Error('Access denied. Authentication required.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }
    logger.info('DashboardStats', `📊 Retrieving dashboard stats for User ID: ${userId}`);
    
    const stats = await firebaseService.getDashboardStats(userId);
    
    return res.status(200).json({
      success: true,
      stats: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/analysis/:id
 * @desc Get full analysis details for a specific analysis record.
 * @access Private
 */
exports.getAnalysisById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.uid : 'anonymous';
    if (userId === 'anonymous' && process.env.NODE_ENV !== 'development') {
      const error = new Error('Access denied. Authentication required.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }
    logger.info('AnalysisDetail', `📂 Retrieving analysis detail for ID: ${id}`);
    
    const analysis = await firebaseService.getAnalysisById(id);
    
    if (!analysis) {
      const error = new Error('Analysis record not found.');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }

    // Security Check: Verify user owns the record. Enforce in all environments.
    if (analysis.userId !== userId) {
      logger.warn('AnalysisDetail', `Access denied: User ${userId} requested record owned by ${analysis.userId}`);
      const error = new Error('Access denied. You are not authorized to view this analysis.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    if (analysis) {
      delete analysis.resumeText;
      delete analysis.detectedSkills;
      delete analysis.atsScore;
    }

    return res.status(200).json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/skills/gap
 * @desc Compare resume text against industry target role expectations.
 * @access Private
 */
exports.analyzeSkillGap = async (req, res, next) => {
  const startTime = Date.now();
  logger.info('SkillGap', '🚀 Starting skill gap analysis...');
  const userId = req.user ? req.user.uid : 'anonymous';
  if (userId === 'anonymous' && process.env.NODE_ENV !== 'development') {
    const error = new Error('Access denied. Authentication required.');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }
  
  try {
    const result = await resumeService.processSkillGapAnalysis(userId, req.body);

    const duration = Date.now() - startTime;
    logger.info('SkillGap', `⏱️ Skill gap analysis completed in ${duration}ms.`);

    return res.status(200).json({
      success: true,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      recommendedSkills: result.recommendedSkills,
      learningRoadmap: result.learningRoadmap
    });
    
  } catch (error) {
    logger.error('SkillGap', `Unexpected Skill Gap Error: ${error.message}`);
    next(error);
  }
};

/**
 * @route POST /api/interview/questions
 * @desc Generate customized interview questions based on resume content.
 * @access Private
 */
exports.generateInterviewQuestions = async (req, res, next) => {
  const startTime = Date.now();
  logger.info('InterviewPrep', '🚀 Starting interview questions generation...');
  const userId = req.user ? req.user.uid : 'anonymous';
  if (userId === 'anonymous' && process.env.NODE_ENV !== 'development') {
    const error = new Error('Access denied. Authentication required.');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }
  
  try {
    const result = await resumeService.processInterviewQuestions(userId, req.body);

    const duration = Date.now() - startTime;
    logger.info('InterviewPrep', `⏱️ Interview questions generation completed in ${duration}ms.`);

    return res.status(200).json({
      success: true,
      technical: result.technical,
      projectBased: result.projectBased,
      skillGap: result.skillGap,
      behavioral: result.behavioral,
      hrQuestions: result.hrQuestions
    });
    
  } catch (error) {
    logger.error('InterviewPrep', `Unexpected Interview Questions Error: ${error.message}`);
    next(error);
  }
};

/**
 * @route GET /api/resumes/history (legacy)
 * @desc Returns legacy mock history values.
 * @access Private (Updated to private for safety)
 */
exports.getUploadHistory = async (req, res, next) => {
  try {
    return res.status(200).json({
      status: 'success',
      data: [
        {
          id: "1",
          fileName: "Jane_Doe_Resume_2026.pdf",
          overallScore: 82,
          analyzedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/analysis/:id
 * @desc Delete a single analysis record by ID.
 * @access Private
 */
exports.deleteAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.uid : 'anonymous';
    if (userId === 'anonymous' && process.env.NODE_ENV !== 'development') {
      const error = new Error('Access denied. Authentication required.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }
    logger.info('DeleteAnalysis', `🗑️ Request to delete analysis ID: ${id} by User ID: ${userId}`);

    // Verify record exists first
    const analysis = await firebaseService.getAnalysisById(id);
    if (!analysis) {
      const error = new Error('Analysis record not found.');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      return next(error);
    }

    // Verify ownership
    if (analysis.userId !== userId) {
      logger.warn('DeleteAnalysis', `Access denied: User ${userId} tried to delete record owned by ${analysis.userId}`);
      const error = new Error('Access denied. You are not authorized to delete this analysis.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    // Delete
    await firebaseService.deleteAnalysis(id, userId);

    return res.status(200).json({
      success: true,
      message: 'Analysis deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
