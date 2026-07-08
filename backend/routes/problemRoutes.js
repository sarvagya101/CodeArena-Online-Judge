const express = require('express');
const problemController = require('../controllers/problemController');

// Accepts the execution rate limiter so the heavier, Docker-backed endpoints
// (compile/run/submit) can be throttled separately from plain reads.
module.exports = function buildProblemRoutes(executionLimiter) {
    const router = express.Router();

    router.get('/problems', problemController.getAllProblems);
    router.get('/problems/:id', problemController.getProblemById);
    router.post('/problems/:id/compile', executionLimiter, problemController.compileCode);
    router.post('/problems/:id/run', executionLimiter, problemController.runCode);
    router.post('/problems/:id/submit', executionLimiter, problemController.submitSolution);
    router.get('/submissions/:id', problemController.getSubmissionsByProblemId);

    return router;
};
